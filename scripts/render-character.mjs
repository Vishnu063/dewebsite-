import fs from 'node:fs';
import {renderCharacter} from './model-portrait.mjs';
const world=JSON.parse(fs.readFileSync(new URL('../data/world.json',import.meta.url)));
const anime=process.argv.includes('--anime');
const characters=anime?world.characters.filter(c=>c.series):world.characters.filter(c=>c.id==='aela-venn');
if(!characters.length)throw Error('No characters found. Run python3 scripts/create_world.py first.');
const directory=new URL(anime?'../static/characters/':'../docs/characters/',import.meta.url);
fs.mkdirSync(directory,{recursive:true});
for(const c of characters){fs.writeFileSync(new URL(c.id+'.svg',directory),renderCharacter(c));console.log('Rendered '+c.name);}
