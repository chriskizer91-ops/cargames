/* =====================================================================================
   THE NIGHT — City Limits only has one: a clear desert night under a full moon. The moon is the
   "sun" of Shiftlight's lighting (its cascades cast the moon shadows), cool and much brighter than
   Shiftlight's own clear night, so the desert and the salt read in silver-blue away from the street
   lights; the town's sodium and LED lamps, the neon and your headlights do the rest.
   ===================================================================================== */
const N=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
export const FULL_MOON={name:'Full Moon',night:1,
  sunDir:N([-.42,.7,-.3]),sunCol:[.46,.55,.76],sunSize:.026,
  ambUp:[.04,.052,.088],ambDn:[.012,.012,.015],
  skyZen:[.0016,.0032,.0095],skyHor:[.008,.0115,.023],skyGlow:[.022,.015,.01],cloud:.06,stars:1,
  fogCol:[.009,.012,.021],fogDen:.0017,fogFall:.018,fogAmb:[.005,.006,.01],
  wet:0,rain:0,puddles:0,lightsOn:1,lit:.5,key:.11,expoRange:[.8,12],bloom:.07,grade:[1.05,1.04],moon:1};
