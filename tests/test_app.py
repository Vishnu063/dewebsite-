import json
from pathlib import Path
import sqlite3
import tempfile
import time
import unittest
from app import create_app, WORLD, CHARACTERS, COOKIE


class WebsiteTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.database=Path(self.temp.name)/'accounts.sqlite3'
        self.app=create_app(dict(TESTING=True,DATABASE=str(self.database)))
        self.client=self.app.test_client()
        self.csrf=self.client.get('/api/session').json['csrf']

    def post(self,path,data=None,client=None,csrf=None):
        return (client or self.client).post(path,json=data,headers={'X-CSRF-Token':csrf or self.csrf})

    def register(self,name='traveller',client=None,csrf=None):
        response=self.post('/api/register',dict(username=name,password='A real password 123'),client,csrf)
        if client is None and response.status_code==200:self.csrf=response.json['csrf']
        return response

    def test_real_registration_hash_rotation_logout_and_login(self):
        before=self.client.get_cookie(COOKIE).value
        response=self.register();self.assertEqual(response.status_code,200)
        self.assertEqual(response.json['user']['username'],'traveller')
        self.assertNotEqual(self.client.get_cookie(COOKIE).value,before)
        self.assertIn('HttpOnly',response.headers['Set-Cookie']);self.assertIn('SameSite=Lax',response.headers['Set-Cookie'])
        with sqlite3.connect(self.database) as db:
            password=db.execute('SELECT password_hash FROM users').fetchone()[0]
            self.assertTrue(password.startswith('scrypt:'));self.assertNotIn('A real password',password)
            tokens=[r[0] for r in db.execute('SELECT token_hash FROM sessions')]
            self.assertNotIn(self.client.get_cookie(COOKIE).value,tokens)
        response=self.post('/api/logout');self.csrf=response.json['csrf']
        self.assertIsNone(self.client.get('/api/session').json['user'])
        wrong=self.post('/api/login',dict(username='traveller',password='wrong password 123'))
        self.assertEqual(wrong.status_code,401)
        good=self.post('/api/login',dict(username='TRAVELLER',password='A real password 123'))
        self.assertEqual(good.status_code,200)

    def test_favourites_are_private_and_persist_after_new_app_instance(self):
        self.register();identifier=next(iter(CHARACTERS))
        self.assertEqual(self.post('/api/favourites/'+identifier).status_code,200)
        self.assertEqual(self.client.get('/api/favourites').json,[identifier])
        self.assertEqual(self.post('/api/favourites/'+identifier).status_code,200)
        other=self.app.test_client();csrf=other.get('/api/session').json['csrf']
        self.register('another_user',other,csrf)
        self.assertEqual(other.get('/api/favourites').json,[])
        response=self.post('/api/logout');self.csrf=response.json['csrf']
        restored=create_app(dict(TESTING=True,DATABASE=str(self.database))).test_client()
        csrf=restored.get('/api/session').json['csrf']
        response=restored.post('/api/login',json=dict(username='traveller',password='A real password 123'),headers={'X-CSRF-Token':csrf})
        self.assertEqual(response.status_code,200)
        self.assertEqual(restored.get('/api/favourites').json,[identifier])
        response=restored.delete('/api/favourites/'+identifier,headers={'X-CSRF-Token':response.json['csrf']})
        self.assertEqual(response.status_code,200);self.assertEqual(restored.get('/api/favourites').json,[])

    def test_csrf_origin_and_unauthenticated_mutations(self):
        target='/api/favourites/'+next(iter(CHARACTERS))
        self.assertEqual(self.client.post(target).status_code,403)
        self.assertEqual(self.post(target).status_code,401)
        response=self.client.post('/api/register',json=dict(username='new_user',password='safe password 123'),headers={'X-CSRF-Token':self.csrf,'Origin':'https://elsewhere.example'})
        self.assertEqual(response.status_code,403)
        self.assertEqual(self.client.get('/api/favourites').status_code,401)

    def test_session_expiry_revokes_access(self):
        self.register()
        with sqlite3.connect(self.database) as db:db.execute('UPDATE sessions SET expires=?',(int(time.time())-1,))
        self.assertEqual(self.client.get('/api/favourites').status_code,401)
        self.assertEqual(self.post('/api/logout').status_code,403)
        self.assertIsNone(self.client.get('/api/session').json['user'])

    def test_rate_limit_and_validation(self):
        for _ in range(8):
            response=self.post('/api/login',dict(username='unknown',password='wrong password 123'))
            self.assertEqual(response.status_code,401)
        self.assertEqual(self.post('/api/login',dict(username='unknown',password='wrong password 123')).status_code,429)
        self.assertEqual(self.post('/api/register',dict(username="'; DROP TABLE users;--",password='safe password 123')).status_code,400)
        self.assertEqual(self.post('/api/register',dict(username='short',password='123')).status_code,400)
        self.assertEqual(self.post('/api/register',dict(username='large',password='x'*129)).status_code,400)
        self.assertEqual(self.post('/api/register',{'username':'new','password':'x'*20000}).status_code,413)

    def test_all_six_page_types_and_missing_routes(self):
        for path in ['/','/characters','/characters/'+next(iter(CHARACTERS)),'/history','/favourites','/account']:
            response=self.client.get(path)
            self.assertEqual(response.status_code,200,path)
            self.assertIn(b'VEYRA',response.data)
            self.assertIn('frame-ancestors',response.headers['Content-Security-Policy'])
            response.close()
        self.assertEqual(self.client.get('/characters/not-a-real-person').status_code,404)
        self.assertEqual(self.client.get('/api/characters/not-a-real-person').status_code,404)
        self.assertEqual(self.client.get('/unknown-page').status_code,404)
        self.assertEqual(self.client.get('/health').json,dict(status='ok',characters=30))

    def test_original_world_inventory(self):
        self.assertEqual(len(CHARACTERS),30)
        self.assertEqual(len({c['name'] for c in CHARACTERS.values()}),30)
        self.assertEqual(len({c['story'] for c in CHARACTERS.values()}),30)
        self.assertEqual(len(WORLD['regions']),3)
        for r in WORLD['regions']:self.assertEqual(sum(c['region']==r['id'] for c in CHARACTERS.values()),10)
        response=self.client.get('/api/world')
        self.assertEqual(response.status_code,200);self.assertEqual(len(response.json['characters']),30)

    def test_duplicate_user_and_unknown_favourite(self):
        self.register()
        self.assertEqual(self.register('TRAVELLER').status_code,409)
        self.assertEqual(self.post('/api/favourites/missing-person').status_code,404)


if __name__=='__main__':unittest.main()
