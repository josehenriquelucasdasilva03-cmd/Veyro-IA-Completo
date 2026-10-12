// Poses procedurais puros, independentes de DOM/WebGL e testáveis em Node.
const TAU=Math.PI*2;
export const MOTIONS=Object.freeze(['idle','thinking','typing','dancing','celebrating','waving','walking','sleeping','surprised','talking','spinning']);
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):min));
export const shortestAngle=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export function poseAt(name='idle',seconds=0){
 const t=Number.isFinite(seconds)?seconds:0,step=Math.sin(t*3),quick=Math.sin(t*9),sway=Math.sin(t*1.6);
 const p={y:.042+.045*Math.sin(t*2),turn:.14*Math.sin(t*.7),lean:.045*sway,headX:.045*Math.sin(t*1.2),headY:.12*Math.sin(t*.55),headZ:.09*sway,
  leftX:-.16+.13*Math.sin(t*1.9),leftZ:-.1+.04*sway,rightX:-.16-.13*Math.sin(t*1.9),rightZ:.1+.04*sway,leftElbowX:-.11,rightElbowX:-.11,leftElbowZ:0,rightElbowZ:0,leftLegX:0,rightLegX:0,
  mouthX:.17,mouthY:.035,eyeY:.16,questionY:2.7,dotY:2.35,questionVisible:0};
 // A piscada dura pouco e não deforma o rosto continuamente.
 const blink=Math.sin(t*1.35)>.994;
 if(blink)p.eyeY=.022;
 switch(name){
  case 'thinking':
   p.headX=.09;p.headY=.16;p.headZ=-.16;
   p.rightZ=-1.24;p.rightX=-.78;p.rightElbowX=-.56;p.leftZ=-.09;
   p.questionVisible=1;p.questionY+=.055*step;p.dotY+=.055*step;
   break;
  case 'typing':
   p.headX=.12;p.leftX=-.81+.11*quick;p.rightX=-.81-.11*quick;
   p.leftZ=-.12;p.rightZ=.12;p.leftElbowX=-.72;p.rightElbowX=-.72;break;
  case 'dancing':
   p.y=.1+Math.abs(step)*.13;p.turn=.22*Math.sin(t*2);
   p.leftZ=-.52+.34*step;p.rightZ=.52+.34*step;
   p.leftLegX=.34*step;p.rightLegX=-.34*step;p.headZ=.14*sway;p.lean=.16*sway;p.leftElbowX=-.45-.2*step;p.rightElbowX=-.45+.2*step;break;
  case 'celebrating':
   p.y=.12+Math.abs(step)*.15;p.leftZ=-2.27;p.rightZ=2.27;
   p.headX=-.1;p.headZ=.08*sway;p.leftElbowX=-.25;p.rightElbowX=-.25;break;
  case 'waving':
   p.rightZ=2.17+.22*step;p.rightX=.16*Math.sin(t*4.2);
   p.headZ=-.07;p.rightElbowX=-.95;p.rightElbowZ=.18*step;break;
  case 'walking':
   p.y=.04+Math.abs(step)*.055;
   p.leftX=.32*step;p.rightX=-.32*step;
   p.leftLegX=-.46*step;p.rightLegX=.46*step;p.lean=.04*step;break;
  case 'sleeping':
   p.y=-.1;p.headZ=-.24;p.headX=.05;p.eyeY=.024;
   p.leftZ=-.09;p.rightZ=.09;p.lean=-.07;break;
  case 'surprised':
   p.y=.09;p.leftZ=-.76;p.rightZ=.76;
   p.headX=-.14;p.mouthX=.07;p.mouthY=.12;p.eyeY=.18;p.leftElbowX=-.35;p.rightElbowX=-.35;break;
  case 'talking':
   p.mouthY=.035+Math.abs(quick)*.085;
   p.rightZ=.28+.11*step;p.rightElbowX=-.35+.12*quick;p.headY=.085*sway;p.lean=.06*sway;break;
  case 'spinning':
   p.turn=((t*1.3)%TAU+TAU)%TAU;
   p.leftZ=-.23;p.rightZ=.23;p.lean=.07*sway;break;
  default: break;
 }
 return p;
}

// Interpolação exponencial estável independentemente do FPS.
export function stepPose(current,target,dt,sharpness=9){
 const delta=clamp(dt,0,.05),weight=1-Math.exp(-sharpness*delta),result={};
 for(const key of Object.keys(target)){
  const from=Number.isFinite(current?.[key])?current[key]:target[key];
  const amount=key==='turn'?shortestAngle(from,target[key]):target[key]-from;
  const blend=key==='eyeY'?1-Math.exp(-27*delta):weight;
  result[key]=from+amount*blend;
 }
 return result;
}
