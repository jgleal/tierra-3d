import numpy as np, wave
sr=44100; T=555.0; n=int(sr*T); t=np.arange(n)/sr
rng=np.random.default_rng(3)
def hz(m): return 440*2**((m-69)/12)
# progression (MIDI): Cmaj9, Am9, Fmaj9, G6/9 ... calm, 10 s per chord
prog=[[48,55,64,67,71,74],[45,52,60,64,67,71],[41,48,57,64,67,69],[43,50,59,62,64,69]]
L=np.zeros(n);Rr=np.zeros(n)
dur=10.0
nch=int(T/dur)+2
for c in range(nch):
    st=c*dur-2.0; chord=prog[c%4]
    a=int(max(0,st)*sr); b=min(n,int((st+dur+4)*sr))
    if a>=b: continue
    tt=t[a:b]-st
    env=np.clip(tt/3.5,0,1)*np.clip((dur+4-tt)/3.5,0,1); env=env**1.5
    for i,m in enumerate(chord):
        f=hz(m)
        for d,pan in ((-0.12,0.3),(0.12,0.7)):
            ph=rng.uniform(0,2*np.pi)
            s=np.sin(2*np.pi*f*(1+d/100)*tt+ph)+0.18*np.sin(2*np.pi*2*f*tt+ph)
            amp=0.05 if m<50 else 0.035
            L[a:b]+=s*env*amp*(1-pan); Rr[a:b]+=s*env*amp*pan
# sparse soft bells (pentatonic)
pent=[72,74,76,79,81,84]
tb=6.0
while tb<T-8:
    m=pent[rng.integers(len(pent))]; f=hz(m); a=int(tb*sr); b=min(n,a+int(4*sr)); tt=t[a:b]-tb
    s=np.sin(2*np.pi*f*tt)*np.exp(-tt*1.3)*np.clip(tt/0.02,0,1)*0.03
    pan=rng.uniform(.25,.75); L[a:b]+=s*(1-pan); Rr[a:b]+=s*pan
    tb+=rng.choice([2.5,3.3,5.0,6.6])
# gentle lowpass (one-pole) 
def lp(x,fc=2500):
    al=np.exp(-2*np.pi*fc/sr); y=np.empty_like(x); acc=0.0
    from scipy.signal import lfilter
    return lfilter([1-al],[1,-al],x)
L=lp(L);Rr=lp(Rr)
fade=np.clip(t/4,0,1)*np.clip((T-t)/6,0,1)
L*=fade;Rr*=fade
st=np.stack([L,Rr],1); st/=np.abs(st).max()*1.05
w=wave.open('/home/claude/geo/audio/music_raw.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr)
w.writeframes((st*32767).astype('<i2').tobytes());w.close()
