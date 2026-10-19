"""Veyra application: original world catalogue, real accounts and private favourites."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlsplit

from flask import Flask, g, jsonify, request, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash

ROOT=Path(__file__).resolve().parent
WORLD=json.loads((ROOT/'data/world.json').read_text())
CHARACTERS={character['id']:character for character in WORLD['characters']}
COOKIE='veyra_session'
LIFETIME=7*24*60*60


def create_app(config=None):
    app=Flask(__name__,static_folder='static')
    app.config.update(DATABASE=str(ROOT/'instance/veyra.sqlite3'),COOKIE_SECURE=os.environ.get('APP_COOKIE_SECURE')=='1',MAX_CONTENT_LENGTH=16*1024)
    if config:app.config.update(config)
    database=Path(app.config['DATABASE']);database.parent.mkdir(parents=True,exist_ok=True)
    with sqlite3.connect(database) as db:
        db.executescript('''
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE NOT NULL,
          password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(
          token_hash TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          csrf TEXT NOT NULL, expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS favourites(
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          character_id TEXT NOT NULL, PRIMARY KEY(user_id,character_id));
        CREATE TABLE IF NOT EXISTS attempts(ip TEXT NOT NULL, account TEXT NOT NULL, at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS attempts_time ON attempts(at);
        ''')
    os.chmod(database,0o600)

    def db():
        if 'db' not in g:
            g.db=sqlite3.connect(app.config['DATABASE'],timeout=10)
            g.db.row_factory=sqlite3.Row
            g.db.execute('PRAGMA foreign_keys=ON')
        return g.db

    @app.teardown_appcontext
    def close_db(error=None):
        connection=g.pop('db',None)
        if connection is not None:connection.close()

    def token_hash(value):return hashlib.sha256(value.encode()).hexdigest()

    def session():
        value=request.cookies.get(COOKIE,'')
        if not value or len(value)>128:return None
        return db().execute('''SELECT s.*,u.username FROM sessions s LEFT JOIN users u ON u.id=s.user_id
                               WHERE token_hash=? AND expires>?''',(token_hash(value),int(time.time()))).fetchone()

    def issue_session(user_id=None):
        value=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(32);now=int(time.time())
        old=request.cookies.get(COOKIE,'')
        with db():
            if old:db().execute('DELETE FROM sessions WHERE token_hash=?',(token_hash(old),))
            db().execute('DELETE FROM sessions WHERE expires<=?',(now,))
            db().execute('INSERT INTO sessions VALUES(?,?,?,?)',(token_hash(value),user_id,csrf,now+LIFETIME))
        user=db().execute('SELECT username FROM users WHERE id=?',(user_id,)).fetchone() if user_id else None
        response=jsonify(user=dict(username=user['username']) if user else None,csrf=csrf)
        response.set_cookie(COOKIE,value,max_age=LIFETIME,httponly=True,secure=app.config['COOKIE_SECURE'],samesite='Lax',path='/')
        return response

    def error(message,status):return jsonify(error=message),status

    @app.before_request
    def protect_mutations():
        if request.path.startswith('/api/') and request.method in {'POST','PUT','PATCH','DELETE'}:
            origin=request.headers.get('Origin')
            if origin:
                parts=urlsplit(origin)
                if parts.scheme not in {'http','https'} or parts.netloc!=request.host:
                    return error('This request must come from the website.',403)
            current=session();supplied=request.headers.get('X-CSRF-Token','')
            if current is None or len(supplied)>128 or not hmac.compare_digest(current['csrf'].encode(),supplied.encode()):
                return error('Your session expired. Refresh the page and try again.',403)
            g.session=current

    @app.after_request
    def headers(response):
        response.headers['X-Content-Type-Options']='nosniff'
        response.headers['X-Frame-Options']='DENY'
        response.headers['Referrer-Policy']='same-origin'
        response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
        if request.path.startswith('/api/'):
            response.headers['Cache-Control']='no-store'
        return response

    @app.get('/api/session')
    def current_session():
        current=session()
        if current is None:return issue_session()
        return jsonify(user=dict(username=current['username']) if current['user_id'] else None,csrf=current['csrf'])

    def credentials():
        data=request.get_json(silent=True)
        if not isinstance(data,dict):return None
        name=data.get('username');password=data.get('password')
        if not isinstance(name,str) or not re.fullmatch(r'[A-Za-z0-9_]{3,32}',name):return None
        if not isinstance(password,str) or not 10<=len(password)<=128:return None
        return name,password

    def limited(account):
        now=int(time.time());ip=request.remote_addr or 'unknown'
        # Do not trust forwarded headers without the deployer's explicit proxy setup.
        with db():
            db().execute('DELETE FROM attempts WHERE at<?',(now-900,))
            total=db().execute('SELECT COUNT(*) FROM attempts WHERE ip=?',(ip,)).fetchone()[0]
            count=db().execute('SELECT COUNT(*) FROM attempts WHERE ip=? AND account=?',(ip,account.casefold())).fetchone()[0]
            if total>=80 or count>=8:return True
            db().execute('INSERT INTO attempts VALUES(?,?,?)',(ip,account.casefold(),now))
        return False

    @app.post('/api/register')
    def register():
        values=credentials()
        if values is None:return error('Use a 3–32 character username (letters, numbers or _) and a 10–128 character password.',400)
        name,password=values
        if limited('register'):return error('Too many account attempts. Try again in 15 minutes.',429)
        encoded=generate_password_hash(password,method='scrypt')
        try:
            with db():cursor=db().execute('INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)',(name,encoded,int(time.time())))
        except sqlite3.IntegrityError:return error('That username is unavailable.',409)
        return issue_session(cursor.lastrowid)

    @app.post('/api/login')
    def login():
        values=credentials()
        if values is None:return error('Username or password is incorrect.',401)
        name,password=values
        if limited(name):return error('Too many login attempts. Try again in 15 minutes.',429)
        user=db().execute('SELECT * FROM users WHERE username=?',(name,)).fetchone()
        # Check a real scrypt hash even when the account does not exist.
        valid=check_password_hash(user['password_hash'] if user else app.config['DUMMY_HASH'],password)
        if user is None or not valid:
            return error('Username or password is incorrect.',401)
        return issue_session(user['id'])

    @app.post('/api/logout')
    def logout():return issue_session()

    @app.get('/api/world')
    def world():return jsonify(WORLD)

    @app.get('/api/characters/<identifier>')
    def character(identifier):
        if identifier not in CHARACTERS:return error('Character not found.',404)
        return jsonify(CHARACTERS[identifier])

    @app.get('/api/favourites')
    def favourites():
        current=session()
        if current is None or current['user_id'] is None:return error('Sign in to see your favourites.',401)
        return jsonify([row[0] for row in db().execute('SELECT character_id FROM favourites WHERE user_id=? ORDER BY character_id',(current['user_id'],))])

    @app.route('/api/favourites/<identifier>',methods=['POST','DELETE'])
    def favourite(identifier):
        current=g.session
        if current['user_id'] is None:return error('Sign in to save a character.',401)
        if identifier not in CHARACTERS:return error('Character not found.',404)
        with db():
            if request.method=='POST':db().execute('INSERT OR IGNORE INTO favourites VALUES(?,?)',(current['user_id'],identifier))
            else:db().execute('DELETE FROM favourites WHERE user_id=? AND character_id=?',(current['user_id'],identifier))
        return jsonify(saved=request.method=='POST')

    @app.get('/health')
    def health():
        db().execute('SELECT 1')
        return jsonify(status='ok',characters=len(CHARACTERS))

    @app.get('/')
    @app.get('/characters')
    @app.get('/characters/<identifier>')
    @app.get('/history')
    @app.get('/favourites')
    @app.get('/account')
    def page(identifier=None):
        if identifier is not None and identifier not in CHARACTERS:
            return error('Character not found.',404)
        return send_from_directory(ROOT/'templates','index.html')

    @app.errorhandler(413)
    def too_large(error_value):return error('Request is too large.',413)

    @app.errorhandler(404)
    def not_found(error_value):return error('Page not found.',404)

    app.config['DUMMY_HASH']=generate_password_hash(secrets.token_urlsafe(32),method='scrypt')
    return app


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--host',default='127.0.0.1');parser.add_argument('--port',type=int,default=8000)
    args=parser.parse_args()
    if not (ROOT/'static/dist/app.js').exists():parser.exit(1,'Build frontend first: npm ci && npm run build\n')
    create_app().run(host=args.host,port=args.port,debug=False)
