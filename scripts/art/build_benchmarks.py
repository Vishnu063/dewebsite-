"""Author benchmark meshes in Blender 4.2; export GLB and real camera renders.
Run: blender -b --python scripts/art/build_benchmarks.py -- --render
Coordinates in the modelling helpers are Y-up, front +Z. No reference images
or third-party meshes/textures are embedded in the exported assets.
"""
import bpy, math, json, sys, argparse
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'static/models'; REVIEW=ROOT/'docs/art-review';OUT.mkdir(parents=True,exist_ok=True);REVIEW.mkdir(parents=True,exist_ok=True)
P=lambda v:Vector((v[0],-v[2],v[1]))
M={}; model_objects=[]
def mat(name,color,rough=.72,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
    return m

def setup_palette():
    global M
    M={k:mat(k,c,r,me) for k,c,r,me in [
      ('skin',(.67,.36,.20),.8,0),('skinLight',(.82,.48,.29),.82,0),('skinShade',(.46,.21,.12),.85,0),
      ('orange',(.92,.265,.025),.83,0),('orangeShade',(.60,.12,.013),.83,0),('black',(.018,.024,.034),.8,0),('hairBlack',(.009,.014,.023),.7,0),
      ('blond',(.95,.61,.065),.74,0),('blondShade',(.60,.31,.022),.8,0),('white',(.94,.92,.80),.75,0),
      ('eyeWhite',(1,.985,.94),.5,0),('blue',(.065,.36,.75),.45,0),('steel',(.40,.47,.52),.35,.65),
      ('engraving',(.08,.10,.12),.65,.1),('red',(.61,.018,.028),.82,0),('redShade',(.36,.01,.018),.82,0),
      ('denim',(.025,.19,.51),.88,0),('denimShade',(.015,.10,.30),.9,0),('straw',(.72,.43,.12),.92,0),
      ('strawLight',(.94,.66,.27),.93,0),('strawShade',(.40,.205,.05),.94,0),('leather',(.23,.115,.05),.85,0),('gold',(.75,.47,.12),.4,.55),('mouth',(.17,.023,.025),.85,0)]}

def attach(obj,parent):
    bpy.context.view_layer.update();world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world
    model_objects.append(obj);return obj

def empty(name,position,parent=None):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=P(position)
    if parent:attach(obj,parent)
    else:model_objects.append(obj)
    return obj

def mesh(name,vertices,faces,material,parent,smooth=True):
    data=bpy.data.meshes.new(name);data.from_pydata([P(v) for v in vertices],[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);data.materials.append(M[material])
    for poly in data.polygons:poly.use_smooth=smooth
    return attach(obj,parent)

def uv(name,pos,scale,material,parent,segments=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=P(pos));o=bpy.context.object;o.name=name
    o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(M[material]);
    for f in o.data.polygons:f.use_smooth=True
    return attach(o,parent)

def loft(name,rings,material,parent,n=32,cap=True,wrinkle=0):
    # Each ring: centre x,y,z, horizontal radius, depth radius.
    vs=[];fs=[]
    for j,(x,y,z,rx,rz) in enumerate(rings):
        for i in range(n):
            a=i*math.tau/n;w=1+wrinkle*math.sin(5*a+j*.85)*math.sin(math.pi*j/max(1,len(rings)-1))
            vs.append((x+rx*math.sin(a)*w,y,z+rz*math.cos(a)*w))
    for j in range(len(rings)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
    if cap:fs.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))])
    if rings[-1][1]<rings[0][1]:fs=[tuple(reversed(f)) for f in fs]
    obj=mesh(name,vs,fs,material,parent)
    if cap:
        for face in list(obj.data.polygons)[-2:]:face.use_smooth=False
    return obj

def tube(name,points,radii,material,parent,n=10):
    pts=[Vector(v) for v in points];vs=[];fs=[]
    for j,p in enumerate(pts):
        tangent=(pts[min(j+1,len(pts)-1)]-pts[max(0,j-1)]).normalized();ref=Vector((0,0,1))
        if abs(tangent.dot(ref))>.95:ref=Vector((1,0,0))
        u=tangent.cross(ref).normalized();v=tangent.cross(u).normalized()
        rad=radii[j] if isinstance(radii,(list,tuple)) else radii
        for i in range(n):vs.append(tuple(p+(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))*rad))
    for j in range(len(pts)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
    fs.extend([tuple(reversed(range(n))),tuple((len(pts)-1)*n+i for i in range(n))])
    return mesh(name,vs,fs,material,parent)

def curve(name,points,radius,material,parent):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=2 if 'weave' in name else 6;data.bevel_depth=radius;data.bevel_resolution=0 if 'weave' in name else 1
    sp=data.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for bp,p in zip(sp.bezier_points,points):bp.co=P(p);bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);data.materials.append(M[material]);return attach(o,parent)

def patch(name,points,material,parent,bulge=0):
    center=Vector((0,0,0))
    for p in points:center+=Vector(p)
    center/=len(points);center.z+=bulge
    vs=[tuple(center)]+points;fs=[(0,i+1,(i+1)%len(points)+1) for i in range(len(points))]
    return mesh(name,vs,fs,material,parent)

def hair_lock(name,points,width,material,parent,thickness=.025):
    # Curved, tapered, closed wedge, rather than a cone placed on a sphere.
    pts=[Vector(p) for p in points];vs=[];fs=[]
    for j,p in enumerate(pts):
        t=j/(len(pts)-1);w=width*(math.sin(math.pi*(t*.86+.10))**.6)*(1-t*.94)
        tangent=(pts[min(j+1,len(pts)-1)]-pts[max(0,j-1)]).normalized();side=tangent.cross(Vector((0,0,1))).normalized()
        if side.length<.1:side=Vector((1,0,0))
        vs.extend([tuple(p-side*w),tuple(p+Vector((0,0,thickness))*(1-t*.8)),tuple(p+side*w),tuple(p-Vector((0,0,thickness*.5)))])
    for j in range(len(pts)-1):
        for k in range(4):a=j*4+k;b=j*4+(k+1)%4;fs.append((a,b,b+4,a+4))
    fs.extend([(3,2,1,0),tuple((len(pts)-1)*4+i for i in range(4))]);return mesh(name,vs,fs,material,parent)

def rig():
    root=empty('benchmark_root',(0,0,0));visual=empty('animated_body',(0,0,0),root)
    nodes={'root':root,'visual':visual,'head':empty('head_joint',(0,2.94,0),visual),'chest':empty('chest_joint',(0,2.03,0),visual)}
    for side,s in [('L',-1),('R',1)]:
        arm=empty('upper_arm_'+side,(s*.36,2.40,0),visual);elbow=empty('forearm_'+side,(s*.48,1.99,.005),arm);hand=empty('hand_'+side,(s*.5,1.59,.02),elbow)
        thigh=empty('thigh_'+side,(s*.17,1.49,0),visual);knee=empty('shin_'+side,(s*.18,.84,.005),thigh);foot=empty('foot_'+side,(s*.18,.18,.035),knee)
        nodes.update({f'arm{side}':arm,f'elbow{side}':elbow,f'hand{side}':hand,f'thigh{side}':thigh,f'knee{side}':knee,f'foot{side}':foot})
    return nodes

def head(n,kind):
    luffy=kind=='luffy';h=n['head'];width=.245 if luffy else .225
    # Tapered jaw, cheek, brow and skull rings, with a true side/back silhouette.
    rs=[(-.25,.06,.07),(-.23,.105,.115),(-.19,.16,.155),(-.12,.205,.177),(-.035,width,.19),(.06,width,.195),(.15,width*.96,.182),(.23,width*.8,.15),(.285,width*.45,.09),(.30,.02,.02)]
    loft('sculpted_head',[(0,2.94+y,-.012,rx,rz) for y,rx,rz in rs],'skinLight',h,n=48)
    loft('neck',[(0,2.48,0,.1,.09),(0,2.69,.005,.09,.085),(0,2.74,.005,.105,.095)],'skinLight',h,n=20)
    # A bridge and wedge tip with nostril/philtrum cues, not a cone nose.
    nose=[(-.027,2.995,.179),(.027,2.995,.179),(-.031,2.88,.179),(.031,2.88,.179),(0,2.90,.255),(-.039,2.874,.209),(.039,2.874,.209),(0,2.86,.202)]
    mesh('nose_bridge',nose,[(0,1,4),(0,4,2),(1,3,4),(2,4,5),(4,3,6),(5,4,7),(4,6,7),(5,7,2),(7,6,3)],'skinLight',h)
    for side in [-1,1]:
        x=side*.224
        uv('ear', (x,2.945,-.016),(.045,.077,.037),'skinLight',h,16,10)
        curve('ear_fold',[(x+side*.012,2.99,.009),(x+side*.028,2.97,.018),(x+side*.014,2.915,.018)],.008,'skinShade',h)
        ey=2.968 if luffy else 2.977;ex=side*.105
        blink=empty('blink_'+('L' if side<0 else 'R'),(ex,ey,.18),h)
        if luffy:
            uv('sclera',(ex,ey,.187),(.068,.077,.018),'eyeWhite',blink,24,14)
            uv('pupil',(ex,ey,.207),(.020,.027,.007),'black',blink,20,12)
            curve('upper_eyelid',[(ex-.067,ey,.191),(ex-.04,ey+.067,.194),(ex+.04,ey+.067,.194),(ex+.067,ey,.191)],.004,'black',h)
            curve('brow',[(ex-.064,ey+.105,.175),(ex+.005,ey+.119,.171),(ex+.057,ey+.103,.163)],.006,'hairBlack',h)
        else:
            pts=[(ex-.072,ey-.003,.182),(ex-.037,ey+.035,.197),(ex+.03,ey+.034,.197),(ex+.071,ey+.003,.182),(ex+.033,ey-.027,.195),(ex-.032,ey-.028,.195)]
            patch('almond_sclera',pts,'eyeWhite',blink,.005)
            uv('blue_iris',(ex,ey,.208),(.029,.030,.007),'blue',blink,24,12)
            uv('pupil',(ex,ey,.216),(.012,.022,.005),'black',blink,16,10)
            uv('eye_glint',(ex-.009,ey+.012,.223),(.006,.007,.003),'eyeWhite',blink,12,8)
            curve('upper_eyelid',pts[:4],.006,'black',h)
            curve('lower_eyelid',[pts[3],pts[4],pts[5],pts[0]],.003,'skinShade',h)
            curve('brow',[(ex-side*.067,ey+.075,.18),(ex,ey+.092,.173),(ex+side*.06,ey+.10,.157)],.009,'blondShade',h)
    if luffy:
        # Curved tooth band and lip line following the cheek surface.
        pts=[(-.137,2.848,.162),(-.08,2.824,.198),(0,2.815,.219),(.08,2.824,.198),(.137,2.848,.162),(.093,2.79,.183),(0,2.773,.207),(-.093,2.79,.183)]
        patch('grin_border',pts,'mouth',h,.002)
        pts2=[(-.124,2.844,.171),(-.07,2.826,.205),(0,2.821,.223),(.07,2.826,.205),(.124,2.844,.171),(.085,2.805,.193),(0,2.791,.216),(-.085,2.805,.193)]
        patch('grin_teeth',pts2,'eyeWhite',h,.002)
        curve('scar_under_left_eye',[(.12,2.88,.18),(.177,2.892,.14)],.0035,'black',h)
        for x,y,z in [(.139,2.883,.170),(.157,2.888,.155)]:curve('scar_stitch',[(x-.004,y-.009,z),(x+.004,y+.009,z)],.0025,'black',h)
    else:
        curve('mouth',[(-.066,2.815,.164),(0,2.803,.187),(.065,2.817,.165)],.004,'skinShade',h)
        for side in [-1,1]:
            for j in range(3):curve('whisker',[(side*.14,2.915-j*.041,.164),(side*.188,2.923-j*.04,.125),(side*.212,2.935-j*.038,.082)],.0035,'black',h)


def scalp(n,kind):
    h=n['head'];is_n=kind=='naruto';color='blond' if is_n else 'hairBlack'
    # Skull-hugging cap, cut above the forehead on the front, down at the nape.
    vs=[];fs=[];N=48;rows=10
    for j in range(rows):
        t=j/(rows-1)
        for i in range(N):
            a=i*math.tau/N;front=max(0,math.cos(a));end=1.95-.85*front
            polar=.04+t*end
            vs.append((.243*math.sin(polar)*math.sin(a),3.012+.262*math.cos(polar),-.025+.208*math.sin(polar)*math.cos(a)))
    for j in range(rows-1):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
    mesh('fitted_hair_cap',vs,fs,color,h)
    if is_n:
        for row in range(2):
            for i in range(11):
                a=i*math.tau/11+.22*row
                base=(.19*math.sin(a),3.15+row*.055,-.025+.15*math.cos(a));tip=(.36*math.sin(a),3.30+row*.1+.035*math.sin(i*3),-.04+.30*math.cos(a))
                mid=tuple(base[k]*.45+tip[k]*.55 for k in range(3));hair_lock('swept_spike',[base,mid,tip],.07 if row==0 else .055,color,h,.024)
        for i in range(6):
            x=-.18+i*.072;hair_lock('nape_spike',[(x,3.055,-.19),(x+.01,2.97,-.22),(x-.015,2.90,-.17)],.033,'blond',h)
        for i in range(5):
            x=-.19+i*.095;hair_lock('forehead_fringe',[(x,3.25,.095),(x+.02,3.16,.16),(x-.015,3.085-(i%2)*.035,.19)],.04,color,h)
    else:
        locks=[(-.20,-.18,2.98),(-.13,-.10,2.99),(-.05,-.02,3.035),(.04,.08,2.99),(.12,.17,3.015),(.20,.23,2.96)]
        for i,(x,tx,ty) in enumerate(locks):hair_lock('fringe_lock',[(x,3.21,.10),(x*.9,3.13,.19),(tx,ty,.20 if abs(tx)<.15 else .13)],.055,'hairBlack',h,.022)
        for side in [-1,1]:
            for j in range(4):hair_lock('side_hair',[(side*.20,3.12-j*.035,-.02-j*.06),(side*.26,3.02-j*.04,-.015-j*.055),(side*(.24+j*.009),2.90-j*.03,-.01-j*.06)],.04,'hairBlack',h)
        for i in range(7):
            x=-.18+i*.06;hair_lock('nape_lock',[(x,3.01,-.18),(x,2.91,-.20),(x+.025,2.85,-.17)],.035,'hairBlack',h)


def hands(n,kind):
    for label,side in [('L',-1),('R',1)]:
        h=n['hand'+label];x=side*.5
        uv('palm',(x,1.505,.022),(.078,.108,.042),'skinLight',h,20,12)
        # Separate tapered fingers and a thumb, attached to a real wrist parent.
        for j in range(4):
            fx=x+(j-1.5)*.032;length=[.14,.16,.151,.12][j]
            tube('finger',[(fx,1.46,.025),(fx,1.405,.036),(fx,1.46-length,.057)], [.015,.014,.011],'skinLight',h,n=8)
            curve('knuckle_crease',[(fx-.009,1.429,.05),(fx+.009,1.429,.05)],.0015,'skinShade',h)
        tube('thumb',[(x-side*.065,1.54,.025),(x-side*.10,1.49,.06),(x-side*.10,1.435,.083)],[.022,.018,.014],'skinLight',h,n=10)


def limbs(n,kind):
    is_n=kind=='naruto'
    for label,side in [('L',-1),('R',1)]:
        a=n['arm'+label];el=n['elbow'+label];hand=n['hand'+label];th=n['thigh'+label];kn=n['knee'+label];ft=n['foot'+label]
        cloth='black' if is_n else 'skinLight'
        loft('upper_arm',[(side*.36,2.40,0,.125,.12),(side*.40,2.31,0,.135,.125),(side*.455,2.12,.005,.105,.10),(side*.48,1.98,.005,.095,.09)],cloth,a,n=24,wrinkle=.025 if is_n else 0)
        uv('shoulder_cap',(side*.36,2.37,0),(.125,.14,.12),cloth,a,24,12)
        uv('elbow_joint',(side*.48,1.99,.005),(.093,.095,.092),cloth,el,20,10)
        loft('forearm',[(side*.48,2.01,.005,.097,.093),(side*.495,1.89,.01,.107,.10),(side*.50,1.70,.02,.078,.072),(side*.50,1.59,.02,.066,.06)],cloth,el,n=24,wrinkle=.018 if is_n else 0)
        if is_n:
            loft('wrist_cuff',[(side*.50,1.67,.02,.083,.076),(side*.50,1.59,.02,.078,.074)],'orange',el,n=24)
            for yy in [1.74,1.83,2.13]:curve('sleeve_fold',[(side*.40,yy,.045),(side*.48,yy-.018,.10),(side*.57,yy+.012,.02)],.0035,'engraving',el if yy<2 else a)
        else:
            curve('elbow_crease',[(side*.425,1.99,.077),(side*.48,1.98,.096),(side*.53,1.99,.077)],.003,'skinShade',el)
        # Hip, knee and ankle are separate articulation points, with shaped legs.
        if is_n:
            loft('trouser_thigh',[(side*.16,1.54,0,.18,.19),(side*.17,1.40,0,.185,.19),(side*.18,1.11,.005,.16,.16),(side*.18,.82,.005,.137,.145)],'orange',th,n=28,wrinkle=.035)
            loft('continuous_knee_bridge',[(side*.18,.895,.005,.143,.148),(side*.18,.84,.005,.141,.148),(side*.18,.795,.005,.146,.147)],'orange',kn,n=28)
            loft('trouser_calf',[(side*.18,.87,.005,.137,.143),(side*.18,.72,.005,.145,.14),(side*.18,.43,.018,.11,.11),(side*.18,.28,.02,.085,.09)],'orange',kn,n=24,wrinkle=.035)
            loft('ankle_sandal_boot',[(side*.18,.40,.02,.093,.095),(side*.18,.19,.045,.094,.12)],'black',ft,n=24)
            loft('boot_cuff',[(side*.18,.34,.02,.109,.113),(side*.18,.29,.02,.106,.112)],'black',ft,n=24)
            if side>0:
                loft('right_thigh_bandage',[(side*.18,1.15,.005,.194,.191),(side*.18,1.035,.005,.188,.187)],'white',th,n=28)
                for j in range(4):curve('bandage_overlap',[(side*.33,1.04+j*.027,.0),(side*.27,1.045+j*.027,.15),(side*.18,1.05+j*.027,.17),(side*.06,1.045+j*.027,.12)],.002,'steel',th)
                loft('kunai_holster',[(.35,1.35,-.015,.048,.07),(.35,1.13,-.015,.045,.06)],'black',th,n=12)
        else:
            loft('bare_thigh',[(side*.17,1.5,0,.14,.135),(side*.18,1.15,0,.115,.12),(side*.18,.85,.01,.085,.085)],'skinLight',th,n=24)
            uv('knee',(side*.18,.84,.01),(.086,.10,.086),'skinLight',kn,20,10)
            loft('calf',[(side*.18,.85,.01,.082,.085),(side*.18,.67,.005,.11,.105),(side*.18,.43,.015,.077,.075),(side*.18,.19,.03,.055,.06)],'skinLight',kn,n=24)
            loft('denim_shorts_leg',[(side*.17,1.57,0,.18,.18),(side*.18,1.42,0,.18,.18),(side*.18,1.20,.005,.195,.17),(side*.18,1.08,.005,.19,.17)],'denim',th,n=28,wrinkle=.04)
            loft('rolled_shorts_hem',[(side*.18,1.15,.005,.20,.18),(side*.18,1.07,.005,.20,.18)],'white',th,n=28,wrinkle=.025)
            for yy in [1.27,1.34]:curve('denim_fold',[(side*.02,yy,.07),(side*.14,yy-.025,.17),(side*.31,yy+.02,.08)],.003,'denimShade',th)
        # Anatomical foot, sole, toe row and actual sandal straps.
        uv('foot',(side*.18,.14,.095),(.095,.077,.19),'skinLight',ft,24,12)
        uv('sandal_sole',(side*.18,.062,.10),(.112,.04,.225),'black' if is_n else 'leather',ft,28,10)
        for j in range(5):uv('toe',(side*.18+(j-2)*.035,.131,.26+(2-j)*.008),(.021,.028,.044),'skinLight',ft,12,8)
        if is_n:
            curve('toe_sandal_band',[(side*.08,.14,.185),(side*.18,.20,.18),(side*.28,.14,.185)],.019,'black',ft)
        else:
            curve('sandal_thong_L',[(side*.18,.17,.25),(side*.12,.208,.16),(side*.08,.147,.02)],.013,'leather',ft)
            curve('sandal_thong_R',[(side*.18,.17,.25),(side*.22,.208,.16),(side*.28,.147,.02)],.013,'leather',ft)
    hands(n,kind)


def torso(n,kind):
    chest=n['chest'];is_n=kind=='naruto'
    rings=[(0,1.44,0,.255,.16),(0,1.57,0,.265,.17),(0,1.74,0,.24,.145),(0,1.98,0,.29,.165),(0,2.23,0,.335,.18),(0,2.40,0,.315,.16),(0,2.52,0,.13,.105)]
    body=loft('tailored_jacket' if is_n else 'torso_skin',rings,'orange' if is_n else 'skinLight',chest,n=40,wrinkle=.012 if is_n else 0)
    if is_n:
        body.data.materials.append(M['black']);body.data.update()
        for f in body.data.polygons:
            if sum(body.data.vertices[i].co.z for i in f.vertices)/len(f.vertices)>2.055:f.material_index=1
    if is_n:
        # Black yoke, shoulder panels and fitted centre zipper strip.
        for side in [-1,1]:
            curve('yoke_seam',[(side*.07,2.02,.18),(side*.27,2.02,.17),(side*.32,2.16,.12)],.004,'orangeShade',chest)
            curve('pocket_welt',[(side*.12,1.76,.145),(side*.23,1.70,.09)],.007,'orangeShade',chest)
        zipper=[(0,1.48,.18),(0,1.57,.185),(0,1.74,.16),(0,1.98,.18),(0,2.23,.195),(0,2.40,.175),(0,2.53,.12)]
        for side in [-1,1]:
            for j in range(len(zipper)-1):
                a=zipper[j];b=zipper[j+1]
                mesh('zipper_strip',[(0,a[1],a[2]),(side*.025,a[1],a[2]),(side*.025,b[1],b[2]),(0,b[1],b[2])],[(0,1,2,3)],'black',chest)
        curve('metal_zipper',zipper,.005,'steel',chest)
        uv('zipper_pull',(0,2.45,.168),(.014,.035,.008),'steel',chest,12,8)
        loft('stand_collar',[(0,2.47,0,.15,.13),(0,2.60,0,.14,.12)],'black',chest,n=32,cap=False)
        for side in [-1,1]:curve('hem_fold',[(side*.23,1.54,.10),(side*.15,1.53,.16),(side*.08,1.55,.17)],.0035,'orangeShade',chest)
        # Back Uzumaki spiral: mounted on the back panel, not floating behind it.
        pts=[]
        for j in range(45):a=j/44*math.tau*1.6;r=.016+.10*j/44;pts.append((r*math.sin(a),2.20+r*math.cos(a),-.184))
        curve('back_spiral',pts,.011,'red',chest)
        uv('waist_pouch',(-.20,1.55,-.19),(.13,.11,.075),'leather',chest,20,12)
        curve('pouch_flap',[(-.30,1.58,-.24),(-.20,1.55,-.27),(-.10,1.58,-.24)],.009,'black',chest)
    else:
        # Vented, sleeveless vest surface wraps to the back with a real open front.
        vs=[];fs=[];N=40
        for j,(x,y,z,rx,rz) in enumerate(rings[:-1]):
            for i in range(N):
                a=.36+(math.tau-.72)*i/(N-1);vs.append(((rx+.018)*math.sin(a),y+.025, (rz+.018)*math.cos(a)))
        for j in range(len(rings)-2):
            for i in range(N-1):
                # Open curved armholes at shoulder level, preserving a back panel.
                a=.36+(math.tau-.72)*(i+.5)/(N-1)
                if j>=3 and (abs(a-math.pi/2)<.56 or abs(a-3*math.pi/2)<.56):continue
                q=j*N+i;fs.append((q,q+1,q+1+N,q+N))
        o=mesh('fitted_open_vest',vs,fs,'red',chest);solid=o.modifiers.new('cloth_thickness','SOLIDIFY');solid.thickness=.012
        for side in [-1,1]:
            mesh('vest_shoulder_strap',[(side*.10,2.43,.15),(side*.24,2.43,.11),(side*.29,2.43,-.08),(side*.16,2.46,-.13),(side*.10,2.47,-.08)],[(0,1,2,3,4)],'red',chest)
            curve('vest_front_edge',[(side*.09,1.48,.17),(side*.09,1.75,.155),(side*.105,2.0,.17),(side*.12,2.22,.18),(side*.12,2.42,.14)],.009,'redShade',chest)
            curve('collar_bone',[(side*.035,2.40,.11),(side*.12,2.39,.14),(side*.20,2.38,.13)],.003,'skinShade',chest)
            for yy in [1.57,1.79,2.0]:uv('vest_button',(side*.105,yy,.183),(.026,.026,.012),'gold',chest,16,8)
            curve('vest_fold',[(side*.12,1.66,.18),(side*.23,1.63,.11),(side*.27,1.61,.025)],.003,'redShade',chest)
        curve('sternum',[(0,2.34,.168),(0,2.23,.184)],.002,'skinShade',chest)
        # East Blue version deliberately has no later chest scar or waist sash.


def naruto_band(n):
    h=n['head'];vs=[];fs=[];N=40
    for yy in [3.055,3.15]:
        for i in range(N):a=i*math.tau/N;vs.append((.234*math.sin(a),yy,-.025+.204*math.cos(a)))
    for i in range(N):j=(i+1)%N;fs.append((i,j,j+N,i+N))
    mesh('cloth_headband',vs,fs,'black',h)
    pts=[(-.16,3.066,.153),(.16,3.066,.153),(.173,3.079,.16),(.173,3.132,.16),(.16,3.145,.153),(-.16,3.145,.153),(-.173,3.132,.16),(-.173,3.079,.16)]
    # Slightly curved plate surface accounts for the skull profile.
    pts=[(x,y,.207-.8*x*x) for x,y,z in pts];patch('metal_forehead_plate',pts,'steel',h,.013)
    for side in [-1,1]:
        for yy in [3.085,3.125]:uv('plate_rivet',(side*.144,yy,.198),(.007,.007,.004),'engraving',h,10,6)
    pts=[]
    for j in range(24):a=j/23*math.tau*1.3;r=.006+.024*j/23;pts.append((r*math.sin(a),3.105+r*math.cos(a),.223))
    curve('leaf_spiral',pts,.0035,'engraving',h)
    curve('leaf_tail',[(-.02,3.086,.223),(-.056,3.083,.223),(-.041,3.11,.223)],.0035,'engraving',h)
    curve('leaf_tip',[(.018,3.122,.223),(.036,3.141,.22),(.039,3.12,.22)],.0035,'engraving',h)
    for side in [-1,1]:
        uv('band_knot',(side*.035,3.09,-.235),(.052,.045,.04),'black',h,16,8)
        mesh('headband_tail',[(side*.035,3.08,-.25),(side*.11,3.07,-.24),(side*.17,2.83,-.20),(side*.12,2.79,-.19)],[(0,1,2,3)],'black',h)


def straw_hat(n):
    h=n['head'];hat=empty('straw_hat',(0,3.25,-.015),h)
    # Shaped brim mesh: double surface and raised outer edge, not a flat disc.
    vs=[];fs=[];N=64
    for radius,yy in [(.22,3.22),(.32,3.195),(.43,3.19),(.47,3.22),(.47,3.242),(.43,3.214),(.32,3.222),(.22,3.245)]:
        for i in range(N):a=i*math.tau/N;vs.append((radius*math.sin(a),yy+.016*math.cos(a),-.02+radius*.88*math.cos(a)))
    for j in range(7):
        for i in range(N):a=j*N+i;b=j*N+(i+1)%N;fs.append((a,b,b+N,a+N))
    mesh('woven_hat_brim',vs,fs,'straw',hat)
    loft('straw_crown',[(0,3.22,-.02,.245,.225),(0,3.30,-.02,.25,.23),(0,3.39,-.025,.20,.18),(0,3.43,-.025,.12,.11),(0,3.44,-.025,.01,.01)],'strawLight',hat,n=48)
    loft('red_hat_ribbon',[(0,3.24,-.02,.251,.231),(0,3.29,-.02,.252,.232)],'red',hat,n=48,cap=False)
    for radius in [.275,.31,.35,.39,.43,.465]:
        pts=[]
        for j in range(65):a=j*math.tau/64;pts.append((radius*math.sin(a),3.225+.013*math.cos(a),-.02+radius*.88*math.cos(a)))
        curve('brim_weave_ring',pts,.0018,'strawLight',hat)
    for i in range(40):
        a=i*math.tau/40
        curve('brim_radial_weave',[(r*math.sin(a),3.227+.013*math.cos(a),-.02+r*.88*math.cos(a)) for r in [.265,.34,.41,.468]],.0016,'strawShade',hat)
    for j in range(6):
        y=3.30+j*.02;r=.25*(1-((y-3.3)/.155)**1.4)
        curve('crown_weave',[(r*math.sin(a*math.tau/48),y,-.02+r*.91*math.cos(a*math.tau/48)) for a in range(49)],.0018,'straw',hat)


def continuous_limbs(n,kind):
    global model_objects
    names={'naruto':('trouser_thigh','trouser_calf','continuous_knee_bridge','cloth_knee'),
           'luffy':('bare_thigh','calf','knee','upper_arm','forearm','elbow_joint')}
    remove=[o for o in model_objects if o.type=='MESH' and o.name.split('.')[0] in names[kind]]
    model_objects=[o for o in model_objects if o not in remove]
    for o in remove:bpy.data.objects.remove(o,do_unlink=True)
    for side in [-1,1]:
        if kind=='naruto':
            rings=[(side*.16,1.54,0,.18,.19),(side*.17,1.4,0,.185,.19),(side*.18,1.12,.005,.16,.16),(side*.18,.95,.005,.14,.145),(side*.18,.84,.005,.137,.143),(side*.18,.74,.005,.142,.14),(side*.18,.58,.012,.132,.127),(side*.18,.43,.018,.11,.11),(side*.18,.28,.02,.085,.09)]
            loft('continuous_trousers',rings,'orange',n['visual'],n=32,wrinkle=.008)
        else:
            rings=[(side*.17,1.5,0,.14,.135),(side*.18,1.15,0,.115,.12),(side*.18,.94,.005,.09,.09),(side*.18,.84,.01,.085,.085),(side*.18,.73,.008,.10,.098),(side*.18,.64,.005,.11,.105),(side*.18,.43,.015,.077,.075),(side*.18,.19,.03,.055,.06)]
            loft('continuous_bare_legs',rings,'skinLight',n['visual'],n=28)
            rings=[(side*.36,2.40,0,.125,.12),(side*.40,2.31,0,.135,.125),(side*.455,2.12,.005,.105,.10),(side*.48,1.99,.005,.095,.09),(side*.495,1.89,.01,.107,.10),(side*.50,1.70,.02,.078,.072),(side*.50,1.59,.02,.066,.06)]
            loft('continuous_arms',rings,'skinLight',n['visual'],n=28)


def merge_by_parent_material():
    # Keep independent joints and eyelids, but batch decoration draw calls.
    groups={}
    for o in list(model_objects):
        if o.type not in {'MESH','CURVE'}:continue
        bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
        if o.type=='CURVE':bpy.ops.object.convert(target='MESH')
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
        key=(o.parent.name if o.parent else '',o.data.materials[0].name if o.data.materials else '',o.name.split('.')[0] if o.name.startswith('continuous_') else '')
        groups.setdefault(key,[]).append(o)
    for group in groups.values():
        if len(group)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in group:o.select_set(True)
        bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()


def lighting():
    world=bpy.data.worlds.new('neutral_studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.37,.42,.49,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;bpy.context.scene.world=world
    for name,pos,power,size in [('key',(-3,5,5),550,4),('fill',(4,3,2),300,3),('rim',(1,5,-3),650,3)]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=P(pos);o.rotation_euler=(P((0,1.7,0))-o.location).to_track_quat('-Z','Y').to_euler()
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=4
    scene.view_settings.view_transform='Standard';scene.render.film_transparent=False;scene.render.resolution_x=520;scene.render.resolution_y=800;scene.render.resolution_percentage=100


def render_views(kind):
    lighting();scene=bpy.context.scene;d=bpy.data.cameras.new('review_camera');o=bpy.data.objects.new('review_camera',d);bpy.context.collection.objects.link(o);scene.camera=o;d.type='ORTHO';d.ortho_scale=3.95
    for name,pos in [('front',(0,1.8,8)),('side',(8,1.8,0)),('back',(0,1.8,-8))]:
        o.location=P(pos);o.rotation_euler=(P((0,1.75,0))-o.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(REVIEW/(kind+'-'+name+'.png'));bpy.ops.render.render(write_still=True)


def build(kind,render=False):
    global model_objects
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);model_objects=[];setup_palette();n=rig();head(n,kind);scalp(n,kind);torso(n,kind);limbs(n,kind)
    if kind=='naruto':naruto_band(n)
    else:straw_hat(n)
    continuous_limbs(n,kind)
    # Shorter anime neck; move the complete head and its attached accessories together.
    n['head'].location.z-=.11
    if kind=='luffy':bpy.data.objects['straw_hat'].rotation_euler.x=-.16
    bpy.context.view_layer.update();merge_by_parent_material();bpy.context.view_layer.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.context.scene.objects:
        if o.type in {'MESH','EMPTY'}:o.select_set(True)
    path=OUT/(kind+'-benchmark.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_materials='EXPORT',export_extras=True)
    sys.path.insert(0,str(Path(__file__).resolve().parent))
    from add_skin_weights import add_skin_weights
    skin_count=add_skin_weights(path)
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH'];triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
    stats={'id':kind,'triangles':triangles,'mesh_objects':len(meshes),'bytes':path.stat().st_size,'textures':0,'skinned_meshes':skin_count,'source':'scripts/art/build_benchmarks.py','blender':'4.2.0','version':'Shippuden standard jacket' if kind=='naruto' else 'East Blue sleeveless red vest','status':'benchmark-awaiting-art-review'}
    (OUT/(kind+'-benchmark.json')).write_text(json.dumps(stats,indent=2)+'\n');print('BENCHMARK',json.dumps(stats))
    if render:render_views(kind)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--render',action='store_true');parser.add_argument('--character',choices=['naruto','luffy','both'],default='both');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    for kind in (['naruto','luffy'] if args.character=='both' else [args.character]):build(kind,args.render)
