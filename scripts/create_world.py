"""The original Veyra character/lore source. Rebuild data/world.json explicitly."""
import json
import math
from pathlib import Path

regions=[
 dict(id='sunmere',name='Sunmere',subtitle='The harbour above the clouds',color='#e5a661',ground='#b4c99a',x=-36,z=0,radius=23,
      story='Brass bells, apricot rooftops and wind-filled sails mark the oldest inhabited isle. Its people tend the lantern that guides drifting islands home. Every arrival leaves a ribbon on the harbour arch; no two ribbons tell the same story.'),
 dict(id='glasswood',name='Glasswood',subtitle='Where the forest remembers',color='#85baa7',ground='#8db49a',x=24,z=-30,radius=23,
      story='The pale trees of Glasswood store light in their leaves. At dusk, the forest quietly replays the shapes of lost paths. Its keepers cultivate living bridges and listen before they build.'),
 dict(id='cinderpeak',name='Cinderpeak',subtitle='A hearth for impossible things',color='#b59bd5',ground='#b4a5ba',x=27,z=31,radius=23,
      story='Here, old volcanic stone floats beside violet crystal. Makers turn fallen fragments into tools, instruments and homes. The great forge has no weapons commission: it was built to mend the world, not conquer it.')
]

# Name, role, signature object, personality, independent story, personal ambition.
residents=[
 ('Ari Solwen','Lantern keeper','lantern','Patient, curious, quietly brave','Ari inherited a harbour lantern that lights only when someone tells the truth. When a night fog hid an arriving island, Ari used a childhood confession to bring its travellers safely into port.','Find the first person who lit the harbour lantern.'),
 ('Mina Tallow','Cloud cartographer','compass','Precise, playful, stubborn','Mina maps the gaps between islands rather than their shores. Her first atlas was drawn on flour sacks, and one of its imaginary routes turned out to be real.','Draw a map with room for places nobody has named.'),
 ('Oren Skiff','Sky ferryman','sail','Warm, practical, unhurried','Oren built a little ferry from an abandoned observatory dome. He carries letters as carefully as passengers and refuses payment for a traveller going home.','Reconnect the silent western ferry route.'),
 ('Tavi Rill','Weather musician','bell','Mischievous, sensitive, inventive','Tavi hears different notes in rain, fog and morning wind. A badly tuned bell once called a storm; since then, Tavi rehearses far from the laundry lines.','Compose a melody that welcomes gentle rain.'),
 ('Sera Penn','Harbour archivist','book','Thoughtful, candid, determined','Sera catalogues the stories tied to harbour ribbons. After discovering her own family had no entry, she started recording the lives that official ledgers overlooked.','Give every ordinary resident a page in the archive.'),
 ('Nilo Finch','Rooftop courier','wings','Restless, generous, optimistic','Nilo invented folding paper wings to cross the harbour roofs. They cannot really fly, but their bright panels help ferrymen spot a courier in heavy cloud.','Deliver an unopened letter addressed to a vanished island.'),
 ('Edda Mossel','Tea alchemist','satchel','Welcoming, observant, wry','Edda makes teas that change colour with the drinker’s mood. Her shop became the harbour’s unofficial meeting place after she added a table with no purchase required.','Grow a tea that tastes different to everyone at the table.'),
 ('Pell Arco','Bridge engineer','hammer','Methodical, gentle, persistent','Pell repairs bridges by studying how they move in the wind. A little wooden model on his desk helped save the oldest crossing when its stone anchors began to drift.','Design a bridge that grows stronger as the islands move.'),
 ('Lumi Wick','Ribbon dancer','ribbon','Expressive, fearless, empathetic','Lumi once danced with signal ribbons to guide a ferry after the harbour bells fell silent. Now every festival performance includes a signal that a lost traveller can follow.','Teach the three isles a shared festival dance.'),
 ('Brin Ossa','Tideglass diver','goggles','Quiet, daring, loyal','Brin collects tideglass from the cloud-sea below the docks. One fragment contains a moving reflection of a harbour that has not been built yet.','Discover whether tideglass remembers the past or imagines tomorrow.'),
 ('Vela Fern','Forest listener','staff','Attentive, patient, protective','Vela learned to notice a tree’s shadow before its leaves. When the forest replayed a missing path, she followed it slowly enough to bring a frightened child home.','Understand the oldest tree’s unfinished memory.'),
 ('Kio Larkspur','Seed runner','satchel','Energetic, hopeful, impulsive','Kio plants seeds in cracks where everyone says nothing will grow. A stubborn little vine on a broken bridge became the first link between two separated clearings.','Plant a garden on the smallest drifting stone.'),
 ('Anwen Dew','Glass botanist','flower','Analytical, tender, inquisitive','Anwen studies leaves that catch the morning light like stained glass. Her notebooks include pressed weeds as carefully labelled as rare blossoms.','Find out why one tree blooms only in shadow.'),
 ('Fenn Valeo','Moth shepherd','wings','Dreamy, dependable, soft-spoken','Fenn guides luminous moths between forest clearings. After a long winter, he learned that the smallest surviving swarm could relight an entire grove.','Restore the moths’ ancient migration route.'),
 ('Iska Reed','Rainwater artisan','bell','Resourceful, direct, cheerful','Iska shapes clay vessels that ring when they are full of rain. Her listening bowls now warn the forest villages before a stream overflows.','Build a fountain whose notes describe the season.'),
 ('Rune Aster','Path gardener','staff','Grounded, humorous, steadfast','Rune tends the moss paths so visitors can find their way without cutting new trails. He keeps one deliberately winding route for people who need time to think.','Create an accessible path to every forest gathering place.'),
 ('Yara Plume','Memory weaver','ribbon','Imaginative, perceptive, private','Yara weaves the shapes of remembered journeys into cloth. A traveller recognised a lost childhood home in a pattern she thought she had invented.','Learn where a borrowed memory begins.'),
 ('Otto Peal','Grove storyteller','book','Patient, theatrical, kind','Otto tells stories whose endings children can change. The forest sometimes repeats their new endings in light, making every audience part of its history.','Collect thirty different endings to the same tale.'),
 ('Nessa Thim','Night pollinator','flower','Independent, meticulous, warm','Nessa tends flowers that open after the moths have gone to sleep. She devised tiny reflecting bowls to carry moonlight into the deepest grove.','Bring a forgotten night garden back into bloom.'),
 ('Cori Sable','Canopy scout','goggles','Alert, candid, adventurous','Cori watches the forest from a lookout built around a living branch. During a driftquake, she marked safe paths with mirrors instead of cutting frightened trees.','Discover the quiet clearing visible only from above.'),
 ('Daro Emberlin','Hearth smith','hammer','Steady, compassionate, exacting','Daro repairs broken objects before making new ones. His best-known work is a cracked family kettle that now pours a perfect cup from either spout.','Forge a tool that can mend skybridge stone.'),
 ('Zia Quartz','Crystal tuner','crystal','Bold, musical, impatient','Zia discovered that uneven crystals make the richest harmonies. Her first public concert used fragments that the great forge had thrown away.','Tune the three island lanterns to the same chord.'),
 ('Marek Coil','Clock tender','compass','Orderly, dry-witted, loyal','Marek maintains clocks that measure drifting distance instead of time. A clock that ran backwards helped him notice the isles were slowly returning to one another.','Build a clock that measures a promise kept.'),
 ('Iri Vossel','Star potter','flower','Gentle, inventive, persistent','Iri mixes luminous dust into everyday pottery. Her bowls glow softly enough to guide a sleepy child without hiding the stars outside.','Make a cup that holds the reflection of an entire constellation.'),
 ('Bex Alloy','Workshop runner','goggles','Fast-thinking, friendly, untidy','Bex knows every workbench in Cinderpeak and somehow loses every pencil. A trail of borrowed tools once led her to an abandoned workshop still running on wind.','Reopen the forgotten community workshop.'),
 ('Solen Drift','Stone glider','sail','Reflective, brave, reserved','Solen pilots a small glider between the floating quarry stones. After a hard landing, he began teaching newcomers how to stop safely before teaching them to soar.','Chart a safe route around the highest floating ridge.'),
 ('Tess Morrow','Forge historian','book','Determined, patient, sceptical','Tess found that the forge’s oldest inscription was a repair manual, not a victory record. She now searches for the makers whose names were polished off its walls.','Recover the signatures of Veyra’s first builders.'),
 ('Navi Kest','Signal maker','lantern','Upbeat, focused, considerate','Navi builds signal lanterns for people who cannot hear the harbour bells. Her lights became part of the islands’ shared language after a fog-bound festival.','Give every message a form everyone can understand.'),
 ('Elio Bramble','Ash gardener','staff','Calm, stubborn, nurturing','Elio grows herbs in warm volcanic ash. A single rooftop planter proved that Cinderpeak could feed flowers as well as fire.','Turn the old quarry into a public garden.'),
 ('Pippa Serein','Festival inventor','ribbon','Joyful, ambitious, thoughtful','Pippa makes mechanical decorations that visitors can repair together. Her favourite invention is a lantern bird powered by a dozen people turning one handle.','Create a festival that brings all three isles to one table.'),
 ('Aela Venn','Cloud gardener','flower','Gentle, adventurous, encouraging','Aela catches stray clouds in woven baskets and waters the harbour gardens with their rain. When a dry summer dimmed the lantern flowers, she followed a wandering cloud home and returned with seeds that bloom in mist.','Grow a floating garden where every traveller can rest.')
]

def build():
    colors=['#e1a365','#79af9e','#8f9abf','#d98f8b','#a7ad6f','#93b4c0','#b9a0c3','#c9a75c','#c78b9b','#7c9ca1']
    hair=['#393640','#f3dbb5','#61514c','#39393e','#b16849','#42565c','#b5a8aa','#453e52','#e1c6a4','#6d5546']
    characters=[]
    for index,(name,role,accessory,personality,story,quest) in enumerate(residents):
        region=regions[index//10] if index<30 else regions[0]
        n=index%10;angle=n*math.tau/10+.2 if index<30 else math.pi/10+.2
        characters.append(dict(id=name.lower().replace(' ','-'),name=name,role=role,region=region['id'],accessory=accessory,
            personality=personality,story=story,quest=quest,color=colors[n],accent=region['color'],hair=hair[n],
            skin=['#e7b992','#b77f60','#f0cfae','#8b5c46','#d5a27d'][index%5],silhouette=index%5,
            x=round(region['x']+13*math.cos(angle),3),z=round(region['z']+13*math.sin(angle),3)))
    characters[-1].update(color='#759e96',hair='#eee1c5',accent='#e5a661',silhouette=1,skin='#d5a27d')
    world=dict(name='Veyra',subtitle='The Lantern Isles',regions=regions,characters=characters,
        history=[dict(year='Year 0',title='The Quiet Sundering',text='The old land rose into the sky, separating villages without erasing their memories. Nobody in Veyra agrees on what caused it. The first surviving records describe neighbours building ropes between their drifting gardens.'),
        dict(year='Year 18',title='A light in the cloud-sea',text='The people of Sunmere raised a lantern for anyone who could no longer see home. Its keeper promised that no arriving traveller would be turned away.'),
        dict(year='Year 41',title='The forest remembers',text='Glasswood’s listeners discovered that its leaves could replay the shapes of lost paths. They began cultivating bridges instead of cutting roads through the groves.'),
        dict(year='Year 67',title='The covenant of the hearth',text='Cinderpeak’s makers agreed that the great forge would mend and shelter, never conquer. They shared tools with the other isles and signed the covenant with the objects they repaired.'),
        dict(year='Year 103',title='Three isles, one sky',text='The first skybridges reconnected Sunmere, Glasswood and Cinderpeak. A festival of lanterns celebrated not an empire, but a promise to keep making room for one another.'),
        dict(year='Today',title='The next chapter is a meeting',text='Thirty-one residents keep the isles alive in their own different ways. Walk their paths, learn their stories, and decide which voices you want to return to.')])
    path=Path(__file__).resolve().parents[1]/'data/world.json';path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(world,indent=2)+'\n')
if __name__=='__main__':build()
