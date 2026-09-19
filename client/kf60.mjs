import pkg from '@playwright/test'; const { chromium } = pkg;
import { spawn, spawnSync } from 'node:child_process';

const rtmpUrl = 'rtmp://127.0.0.1:1941/live/test';
const received = '/tmp/kf60-received.flv';
const server = spawn('ffmpeg', ['-hide_banner','-loglevel','warning','-listen','1','-i',rtmpUrl,'-c','copy','-f','flv','-y',received]);
await new Promise(r => setTimeout(r, 800));

// Current production copy args
const args = ['-hide_banner','-loglevel','info','-nostats','-progress','pipe:2','-i','pipe:0','-map','0:v:0','-map','0:a:0?','-c:v','copy','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-af','aresample=async=1:first_pts=0','-f','flv', rtmpUrl];
const enc = spawn('ffmpeg', args);
const encDone = new Promise(r => enc.on('close', r));

const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'] });
const page = await browser.newPage();
await page.exposeFunction('relay', b => { if(enc.stdin.writable) enc.stdin.write(Buffer.from(b)); });
await page.evaluate(async () => {
  const canvas = document.createElement('canvas'); canvas.width=1920; canvas.height=1080;
  const ctx = canvas.getContext('2d',{alpha:false});
  const video = canvas.captureStream(30);
  const audio = new AudioContext({sampleRate:48000}); const dest=audio.createMediaStreamDestination();
  const clk=audio.createOscillator(); const g=audio.createGain(); g.gain.value=0; clk.connect(g).connect(dest); clk.start(); await audio.resume();
  const combined = new MediaStream([video.getVideoTracks()[0], dest.stream.getAudioTracks()[0]]);
  const rec = new MediaRecorder(combined, { mimeType:'video/webm;codecs=h264,opus', videoBitsPerSecond:4_500_000, videoKeyFrameIntervalDuration:2000 });
  rec.ondataavailable = async e => { if(e.data.size) await window.relay(Array.from(new Uint8Array(await e.data.arrayBuffer()))); };
  rec.start(250);
  let f=0; const t=setInterval(()=>{ f++;
    // realistic moving content: gradient + moving box + noise-ish
    ctx.fillStyle=`hsl(${(f*2)%360},60%,45%)`; ctx.fillRect(0,0,1920,1080);
    ctx.fillStyle='#fff'; ctx.fillRect((f*7)%1720, 400+Math.sin(f/10)*200, 200, 200);
    ctx.font='90px sans-serif'; ctx.fillText('T='+(f/30).toFixed(1)+'s', 80, 150);
  },1000/30);
  await new Promise(r=>setTimeout(r,60000)); clearInterval(t); rec.stop(); await new Promise(r=>setTimeout(r,800));
});
enc.stdin.end(); await browser.close(); await encDone;
await new Promise(r=>setTimeout(r,1500)); server.kill('SIGINT'); await new Promise(r=>setTimeout(r,800));

const pk = spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','packet=pts_time,flags','-of','csv=p=0',received],{encoding:'utf8'});
const pkts = pk.stdout.trim().split('\n').filter(Boolean);
const keyTimes = pkts.filter(p=>p.includes('K')).map(k=>parseFloat(k.split(',')[0])).filter(n=>!isNaN(n));
const allTimes = pkts.map(p=>parseFloat(p.split(',')[0])).filter(n=>!isNaN(n));
let nonMono=0; for(let i=1;i<allTimes.length;i++) if(allTimes[i]<allTimes[i-1]) nonMono++;
const gaps = keyTimes.slice(1).map((t,i)=>+(t-keyTimes[i]).toFixed(2));
console.log('duration received:', spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',received],{encoding:'utf8'}).stdout.trim());
console.log('total video packets:', pkts.length);
console.log('keyframes:', keyTimes.length);
console.log('keyframe times:', keyTimes.map(t=>t.toFixed(1)).join(', '));
console.log('keyframe gaps:', gaps.join(', '));
console.log('MAX keyframe gap:', gaps.length?Math.max(...gaps):'n/a', Math.max(...gaps)>3?'❌ FREEZE RISK':'✓');
console.log('non-monotonic PTS:', nonMono, nonMono>0?'❌':'✓');
// check A/V sync drift
const va = spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,duration,start_time','-of','csv=p=0',received],{encoding:'utf8'});
console.log('streams (type,duration,start):', va.stdout.trim().replace(/\n/g,' | '));
