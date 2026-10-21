"""Add glTF joint weights to the continuous elbow/knee meshes authored in Blender.
Uses the existing exported joint nodes; no external meshes or animation data.
"""
import json,struct
from mathutils import Matrix,Quaternion,Vector

def add_skin_weights(path):
    data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);binary=bytearray(data[28+length:]);nodes=doc['nodes'];parents={child:i for i,n in enumerate(nodes) for child in n.get('children',[])}
    def world(i):
        n=nodes[i]
        if 'matrix' in n:m=Matrix([n['matrix'][j:j+4] for j in range(0,16,4)]).transposed()
        else:
            q=n.get('rotation',[0,0,0,1]);m=Matrix.Translation(Vector(n.get('translation',[0,0,0]))) @ Quaternion((q[3],q[0],q[1],q[2])).to_matrix().to_4x4() @ Matrix.Diagonal(Vector([*n.get('scale',[1,1,1]),1]))
        return world(parents[i])@m if i in parents else m
    def accessor(raw,component,count,kind):
        while len(binary)%4:binary.append(0)
        view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':len(binary),'byteLength':len(raw)});binary.extend(raw)
        index=len(doc['accessors']);doc['accessors'].append({'bufferView':view,'componentType':component,'count':count,'type':kind});return index
    by_name={n.get('name'):i for i,n in enumerate(nodes)};skins=doc.setdefault('skins',[])
    for index,node in enumerate(nodes):
        name=node.get('name','')
        if not name.startswith(('continuous_trousers','continuous_arms','continuous_bare_legs')):continue
        arms=name.startswith('continuous_arms');joint_names=['upper_arm_L','forearm_L','upper_arm_R','forearm_R'] if arms else ['thigh_L','shin_L','thigh_R','shin_R'];joint_ids=[by_name[n] for n in joint_names]
        inverse=[]
        for joint in joint_ids:
            inv=world(joint).inverted()
            inverse.extend(inv[r][c] for c in range(4) for r in range(4))
        inverse_id=accessor(struct.pack('<'+'f'*len(inverse),*inverse),5126,4,'MAT4')
        node['skin']=len(skins);skins.append({'joints':joint_ids,'inverseBindMatrices':inverse_id})
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            a=doc['accessors'][primitive['attributes']['POSITION']];v=doc['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',12)
            joints=bytearray();weights=[]
            for k in range(a['count']):
                x,y,z=struct.unpack_from('<fff',binary,start+k*stride);base=0 if x<0 else 2
                center,spread=(1.99,.16) if arms else (.84,.20);w=max(0,min(1,(center+spread-y)/(2*spread)));w=w*w*(3-2*w)
                joints.extend([base,base+1,0,0]);weights.extend([1-w,w,0,0])
            primitive['attributes']['JOINTS_0']=accessor(joints,5121,a['count'],'VEC4');primitive['attributes']['WEIGHTS_0']=accessor(struct.pack('<'+'f'*len(weights),*weights),5126,a['count'],'VEC4')
    doc['buffers'][0]['byteLength']=len(binary)
    while len(binary)%4:binary.append(0)
    text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4)
    total=12+8+len(text)+8+len(binary);path.write_bytes(struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary)
    return len(skins)
