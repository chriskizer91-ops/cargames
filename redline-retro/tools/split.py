# One-off: cut the original single-file game into source modules (kept for the record).
import sys
src=sys.argv[1]
L=open(src,encoding='utf8').read().split('\n')
mods=[(724,'10_core'),(981,'11_sl3'),(4073,'12_display'),(4127,'12_mesh'),(4235,'13_lit'),(5004,'14_loft'),
(5081,'15_digital_engine'),(6209,'16_engines'),(6321,'17_engine_sound'),(6449,'20_suv'),(7016,'21_parts'),(7310,'22_bodies'),
(7820,'23_wheels'),(7953,'24_bay'),(8126,'25_builds'),(8249,'26_car_mesh'),(8322,'27_machines'),(8579,'40_physics'),
(9276,'41_ground'),(9387,'42_chassis'),(9543,'43_sim'),(9682,'44_city_cars'),(9766,'45_drivers'),(10055,'46_electric'),
(10151,'49_textures'),(10176,'49_voices'),(10179,'50_worldgen'),(11608,'51_world'),(12009,'52_world_gl'),(12295,'53_fx'),
(12408,'54_dev'),(12603,'55_gfx'),(12693,'55_post'),(12814,'56_parts'),(13161,'57_ratings'),(13338,'57_city_garage'),
(13424,'58_feats'),(13678,'59_daynight'),(13795,'60_game'),(14384,'61_career'),(14460,'62_race'),(14745,'63_traffic'),
(15203,'64_streets'),(15438,'65_police'),(15933,'66_clocks'),(16024,'67_challenges'),(16477,'68_people'),(16686,'69_nitrous'),
(16734,'70_hud'),(16878,'71_menu'),(17116,'72_garage'),(17226,'73_showroom'),(17917,'74_dyno_lab'),(18279,'75_tune'),
(18380,'76_touch'),(18450,'90_boot')]
END=18502
open('shell/head.html','w',encoding='utf8').write('\n'.join(L[0:723])+'\n')
open('shell/tail.html','w',encoding='utf8').write('\n'.join(L[END:])+'')
order=[]
for k,(a,n) in enumerate(mods):
    b=mods[k+1][0]-1 if k+1<len(mods) else END
    open(f'src/{n}.js','w',encoding='utf8').write('\n'.join(L[a-1:b])+'\n')
    order.append(n)
    print(f'{n:22s} {a:6d}-{b:6d}  {L[a-1][:90]}')
open('tools/modules.txt','w').write('\n'.join(order)+'\n')
