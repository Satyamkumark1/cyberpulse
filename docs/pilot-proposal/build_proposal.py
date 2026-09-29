#!/usr/bin/env python3
"""Build the proposal as vector PDF and self-contained SVG/HTML, without dependencies.

Fonts are embedded from macOS Arial. All dashboard values are illustrative.
Run: python3 docs/pilot-proposal/build_proposal.py
"""
from pathlib import Path
import hashlib
import html
import json
import math
import re
import struct
import zlib

ROOT = Path(__file__).resolve().parent
W, H = 595.276, 841.89
NAVY, TEAL, BLUE = '#132c46', '#087f83', '#215fc0'
INK, MUTED, LINE = '#22374c', '#5c6d7c', '#dce5eb'
PALE, MINT, WHITE, AMBER = '#f3f7fa', '#e9f6f3', '#ffffff', '#a56514'
TEAM = 'Quartz visailz'
INSTITUTION = 'Maharishi University of Technology, Noida'


class Font:
    def __init__(self, path, name):
        self.data = Path(path).read_bytes()
        self.name = name
        u16 = lambda o: struct.unpack_from('>H', self.data, o)[0]
        i16 = lambda o: struct.unpack_from('>h', self.data, o)[0]
        u32 = lambda o: struct.unpack_from('>I', self.data, o)[0]
        self.tables = {}
        for i in range(u16(4)):
            at = 12 + i * 16
            self.tables[self.data[at:at+4].decode()] = u32(at+8)
        head, hhea = self.tables['head'], self.tables['hhea']
        self.units = u16(head+18)
        self.bbox = [i16(head+i) * 1000 / self.units for i in (36,38,40,42)]
        self.asc = i16(hhea+4) * 1000 / self.units
        self.desc = i16(hhea+6) * 1000 / self.units
        n = u16(hhea+34)
        self.advances = [u16(self.tables['hmtx']+i*4) for i in range(n)]
        cmap = self.tables['cmap']
        selected = None
        for i in range(u16(cmap+2)):
            at = cmap+4+i*8
            sub = cmap+u32(at+4)
            if u16(sub) == 4:
                selected = sub
                if u16(at) == 3 and u16(at+2) == 1:
                    break
        self.mapping = {}
        at = selected
        segs = u16(at+6)//2
        ends = at+14
        starts = ends+2*segs+2
        deltas = starts+2*segs
        ranges = deltas+2*segs
        for s in range(segs):
            for cp in range(u16(starts+s*2), min(u16(ends+s*2), 0xffff)+1):
                off = u16(ranges+s*2)
                glyph = u16(ranges+s*2+off+(cp-u16(starts+s*2))*2) if off else cp
                if glyph:
                    glyph = (glyph+i16(deltas+s*2)) & 0xffff
                self.mapping[cp] = glyph

    def width(self, text, size):
        return sum(self.advances[min(self.mapping.get(ord(c),0),len(self.advances)-1)] for c in text) / self.units * size


FONTS = [Font('/System/Library/Fonts/Supplemental/Arial.ttf', 'ArialMT'),
         Font('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'Arial-BoldMT')]


def rgb(c):
    return ' '.join(f'{int(c[i:i+2],16)/255:.4f}' for i in (1,3,5))


class Page:
    def __init__(self, number, section):
        self.number, self.section = number, section
        self.ops, self.svg, self.links = [], [], []
        self.text_bounds = []
        self.rect(0,0,W,H,WHITE)
        self.text(42,28,'CYBERPULSE AI',9,True,NAVY)
        self.text(W-42,28,'PILOT EVALUATION PROPOSAL',7.2,False,MUTED,'right')
        self.line(42,48,W-42,48,LINE,.7)
        self.line(42,795,W-42,795,LINE,.7)
        self.text(42,808,f'{TEAM}  /  18 September 2026',7.2,False,MUTED)
        self.text(W-42,808,f'{section.upper()}   •   {number:02d} / 06',7.2,False,MUTED,'right')

    def rect(self,x,y,w,h,fill=None,stroke=None,r=0,lw=1):
        self.svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{lw}"/>')
        style = (rgb(fill)+' rg ' if fill else '')+(rgb(stroke)+f' RG {lw} w ' if stroke else '')
        if r:
            k=r*.55228475
            def pt(a,b):return f'{a:.3f} {H-b:.3f}'
            p = f'{pt(x+r,y)} m {pt(x+w-r,y)} l {pt(x+w-r+k,y)} {pt(x+w,y+r-k)} {pt(x+w,y+r)} c '
            p += f'{pt(x+w,y+h-r)} l {pt(x+w,y+h-r+k)} {pt(x+w-r+k,y+h)} {pt(x+w-r,y+h)} c '
            p += f'{pt(x+r,y+h)} l {pt(x+r-k,y+h)} {pt(x,y+h-r+k)} {pt(x,y+h-r)} c '
            p += f'{pt(x,y+r)} l {pt(x,y+r-k)} {pt(x+r-k,y)} {pt(x+r,y)} c h '
        else:p=f'{x:.3f} {H-y-h:.3f} {w:.3f} {h:.3f} re '
        self.ops.append('q '+style+p+('B' if fill and stroke else 'f' if fill else 'S')+' Q')

    def line(self,x1,y1,x2,y2,color=LINE,lw=1,dash=False):
        self.svg.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{color}" stroke-width="{lw}" '+('stroke-dasharray="4 3"' if dash else '')+'/>')
        self.ops.append(f'q {rgb(color)} RG {lw} w '+('[4 3] 0 d ' if dash else '')+f'{x1:.3f} {H-y1:.3f} m {x2:.3f} {H-y2:.3f} l S Q')

    def poly(self,points,fill=None,stroke=None,lw=1,dash=False):
        pts=' '.join(f'{x},{y}' for x,y in points)
        self.svg.append(f'<polygon points="{pts}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{lw}" '+('stroke-dasharray="4 3"' if dash else '')+'/>')
        p=' '.join(f'{x:.3f} {H-y:.3f} '+('m' if i==0 else 'l') for i,(x,y) in enumerate(points))+' h '
        self.ops.append('q '+(rgb(fill)+' rg ' if fill else '')+(rgb(stroke)+f' RG {lw} w ' if stroke else '')+('[4 3] 0 d ' if dash else '')+p+('B' if fill and stroke else 'f' if fill else 'S')+' Q')

    def circle(self,x,y,r,fill,stroke=None,lw=1):
        self.poly([(x+math.cos(i*math.tau/48)*r,y+math.sin(i*math.tau/48)*r) for i in range(48)],fill,stroke,lw)

    def text(self,x,y,text,size=10,bold=False,color=INK,align='left',url=None):
        text=str(text)
        width=FONTS[int(bold)].width(text,size)
        if align=='right':x-=width
        if align=='center':x-=width/2
        baseline=y+size*.91
        enc=text.encode('cp1252',errors='strict').hex().upper()
        self.ops.append(f'BT /F{int(bold)+1} {size} Tf {rgb(color)} rg 1 0 0 1 {x:.3f} {H-baseline:.3f} Tm <{enc}> Tj ET')
        self.svg.append(f'<text x="{x}" y="{baseline}" font-family="Arial,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}" fill="{color}">{html.escape(text)}</text>')
        self.text_bounds.append((x,y,width,size,text))
        if url:
            self.links.append((x,y,width,size+3,url))
            self.svg.append(f'<a href="{html.escape(url)}"><rect x="{x}" y="{y}" width="{width}" height="{size+3}" fill="transparent"/></a>')
        return width

    def para(self,x,y,text,width,size=10.2,color=INK,bold=False,leading=None):
        lead=leading or size*1.43
        cy=y
        for paragraph in text.split('\n'):
            line=''
            for word in paragraph.split():
                candidate=f'{line} {word}'.strip()
                if FONTS[int(bold)].width(candidate,size)>width and line:
                    self.text(x,cy,line,size,bold,color);cy+=lead;line=word
                else:line=candidate
            if line:self.text(x,cy,line,size,bold,color);cy+=lead
            cy+=3
        return cy

    def arrow(self,points,label=None,lx=None,ly=None,dash=False,color=TEAL):
        for a,b in zip(points,points[1:]):self.line(*a,*b,color,1.6,dash)
        (x0,y0),(x,y)=points[-2:]
        a=math.atan2(y-y0,x-x0)
        self.poly([(x,y),(x-6*math.cos(a)+3*math.sin(a),y-6*math.sin(a)-3*math.cos(a)),(x-6*math.cos(a)-3*math.sin(a),y-6*math.sin(a)+3*math.cos(a))],color)
        if label:self.text(lx,ly,label,7.5,False,MUTED)

    def badge(self,x,y,text,fill=MINT,color=TEAL):
        width=FONTS[1].width(text,7.5)+18
        self.rect(x,y,width,20,fill,r=10)
        self.text(x+9,y+5,text,7.5,True,color)

    def heading(self,kicker,title,desc=None):
        self.text(42,72,kicker.upper(),8.5,True,TEAL)
        self.text(42,96,title,27,True,NAVY)
        if desc:self.para(42,139,desc,511,10.7,MUTED)

    def node(self,x,y,w,h,title,body,accent=TEAL):
        self.rect(x,y,w,h,WHITE,LINE,8)
        self.rect(x,y,4,h,accent,r=2)
        self.text(x+15,y+14,title,11,True,NAVY)
        self.para(x+15,y+34,body,w-30,9,MUTED)

    def svg_doc(self):
        transcript = ' '.join(text for _, _, _, _, text in self.text_bounds)
        label = f'Page {self.number}: {self.section}'
        source_links = ''.join(
            f'<li><a href="{html.escape(url, quote=True)}">{html.escape(url)}</a></li>'
            for _, _, _, _, url in self.links
        )
        return (
            f'<div class="sr-only" id="page-{self.number}-transcript"><h2>{html.escape(label)}</h2>'
            f'<p>{html.escape(transcript)}</p>'
            f'{f"<h3>Sources</h3><ul>{source_links}</ul>" if source_links else ""}</div>'
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
            f'aria-hidden="true" focusable="false">'+''.join(self.svg)+'</svg>'
        )


class PDF:
    def __init__(self):self.objs=[]
    def add(self,data):
        self.objs.append(data.encode('latin1') if isinstance(data,str) else data)
        return len(self.objs)
    def stream(self,data,extra=''):
        data=zlib.compress(data)
        return self.add(f'<< /Length {len(data)} /Filter /FlateDecode {extra} >>\nstream\n'.encode()+data+b'\nendstream')
    def save(self,pages,path):
        catalog=self.add('');pages_id=self.add('')
        fonts=[]
        for f in FONTS:
            fontfile=self.stream(f.data,f'/Length1 {len(f.data)}')
            desc=self.add(f'<< /Type /FontDescriptor /FontName /{f.name} /Flags 32 /FontBBox [{" ".join(str(round(v)) for v in f.bbox)}] /ItalicAngle 0 /Ascent {f.asc:.0f} /Descent {f.desc:.0f} /CapHeight 716 /StemV 90 /FontFile2 {fontfile} 0 R >>')
            widths=[]; pairs=[]
            for c in range(32,256):
                try:ch=bytes([c]).decode('cp1252')
                except UnicodeDecodeError:ch='?'
                widths.append(str(round(f.width(ch,1000))))
                pairs.append(f'<{c:02X}> <{ord(ch):04X}>')
            cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /ArialUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<00> <FF>\nendcodespacerange\n'
            for start in range(0,len(pairs),100):
                batch=pairs[start:start+100];cmap+=f'{len(batch)} beginbfchar\n'+'\n'.join(batch)+'\nendbfchar\n'
            cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend'
            uni=self.stream(cmap.encode())
            fonts.append(self.add(f'<< /Type /Font /Subtype /TrueType /BaseFont /{f.name} /FirstChar 32 /LastChar 255 /Widths [{" ".join(widths)}] /FontDescriptor {desc} 0 R /Encoding /WinAnsiEncoding /ToUnicode {uni} 0 R >>'))
        ids=[]
        for page in pages:
            stream=self.stream('\n'.join(page.ops).encode())
            annots=[]
            for x,y,w,h,url in page.links:
                safe=url.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')
                annots.append(self.add(f'<< /Type /Annot /Subtype /Link /Rect [{x} {H-y-h} {x+w} {H-y}] /Border [0 0 0] /A << /S /URI /URI ({safe}) >> >>'))
            aid=' /Annots ['+' '.join(f'{i} 0 R' for i in annots)+']' if annots else ''
            ids.append(self.add(f'<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {W} {H}] /Resources << /Font << /F1 {fonts[0]} 0 R /F2 {fonts[1]} 0 R >> >> /Contents {stream} 0 R{aid} >>'))
        self.objs[catalog-1]=f'<< /Type /Catalog /Pages {pages_id} 0 R /Lang (en-IN) /ViewerPreferences << /DisplayDocTitle true >> >>'.encode()
        self.objs[pages_id-1]=f'<< /Type /Pages /Kids [{" ".join(f"{i} 0 R" for i in ids)}] /Count {len(ids)} >>'.encode()
        info=self.add('<< /Title (CyberPulse AI - RBIH Pilot Evaluation Proposal) /Author (Quartz visailz) /Subject (Proposed pilot; synthetic prototype; officer-reviewed cash-out forecasting) /Creator (CyberPulse proposal builder) >>')
        out=bytearray(b'%PDF-1.7\n%\xe2\xe3\xcf\xd3\n'); offsets=[0]
        for i,obj in enumerate(self.objs,1):
            offsets.append(len(out));out+=f'{i} 0 obj\n'.encode()+obj+b'\nendobj\n'
        pos=len(out);out+=f'xref\n0 {len(offsets)}\n0000000000 65535 f \n'.encode()
        for offset in offsets[1:]:out+=f'{offset:010d} 00000 n \n'.encode()
        out+=f'trailer\n<< /Size {len(offsets)} /Root {catalog} 0 R /Info {info} 0 R >>\nstartxref\n{pos}\n%%EOF\n'.encode()
        path.write_bytes(out)


def build():
    pages=[]
    p=Page(1,'Overview');pages.append(p)
    p.badge(42,78,'PROPOSED PILOT  •  SYNTHETIC PROTOTYPE')
    p.text(42,123,'CyberPulse AI',44,True,NAVY)
    p.text(42,183,'Anticipate the next cash-out.',24,True,NAVY)
    p.para(42,226,'Predictive location and time-window forecasting for cyber-fraud investigations.',455,16,MUTED,leading=22)
    p.rect(42,299,511,145,NAVY,r=12)
    p.text(62,319,'THE PILOT QUESTION',8.5,True,'#72d5cd')
    p.para(62,346,'Can ranked cash-out areas and time windows help investigators prioritise leads faster than historical-hotspot methods?',464,19,WHITE,True,25)
    for x,title,body in [(42,'WHERE','Candidate geographic areas'),(217,'WHEN','2–4-hour estimated windows'),(392,'WHY','Model feature explanations')]:
        p.rect(x,462,161,82,PALE,r=8)
        p.text(x+14,478,title,9,True,TEAL)
        p.para(x+14,501,body,135,11,INK,True,15)
    p.para(42,558,'Current model scope: H3 resolution 8 areas; a 24-hour horizon from the complaint timestamp. Forecasts are leads for review, not confirmed withdrawal addresses.',507,9.3,MUTED)
    p.text(42,622,'REQUESTED NEXT STEP',8.5,True,TEAL)
    p.para(42,643,'A technical review with RBIH and a scoped, authorised data evaluation with suitable institutional partners.',506,12.5,INK,True,18)
    p.line(42,699,553,699,LINE)
    p.text(42,716,TEAM,12,True,NAVY)
    p.text(42,736,INSTITUTION,9.3,False,MUTED)
    p.text(42,757,'18 September 2026  •  Problem Statement 26184  •  Revision 2',8,False,MUTED)

    p=Page(2,'Operational fit');pages.append(p)
    p.heading('01 / Ecosystem alignment','Where CyberPulse fits','A proposed decision-support step using authorised case records. Existing bank coordination and fund-protection efforts continue in parallel. [1, 2]')
    p.badge(42,192,'PROPOSED WORKFLOW  •  NO LIVE INTEGRATION')
    p.node(55,238,225,80,'Complaint + linked records','Complaint details, permitted transaction links and prior withdrawal outcomes.')
    p.node(354,238,186,80,'Bank coordination','Existing channels for tracing and protecting available funds.',BLUE)
    p.arrow([(280,278),(354,278)],'in parallel',289,259,True,BLUE)
    p.node(55,370,225,90,'CyberPulse analysis','Rank candidate areas; estimate a time window; explain model influences.')
    p.arrow([(168,318),(168,370)],'permitted records',180,338)
    p.node(55,512,225,80,'Officer review','Check evidence, freshness and uncertainty; prioritise follow-up.')
    p.arrow([(168,460),(168,512)],'ranked leads',180,480)
    p.node(354,512,186,80,'Authorised action','Use existing agency channels. Record decisions and outcomes.',BLUE)
    p.arrow([(280,552),(354,552)],'decision',291,533)
    p.rect(42,621,511,71,MINT,r=8)
    p.text(57,635,'PROPOSED CONTRIBUTION',8.5,True,TEAL)
    p.para(57,655,'Help an investigator choose which lead to examine next. An area forecast does not identify an accused person or justify sending police to every ATM.',481,10,INK)
    p.para(42,711,'RBIH’s MuleHunter.ai focuses on mule-account detection. The May 2026 I4C–RBIH MoU supports intelligence sharing. CyberPulse proposes complementary cash-out forecasting; access to those systems is not assumed. [2, 3]',511,9.5,MUTED)

    p=Page(3,'Product walkthrough');pages.append(p)
    p.heading('02 / Investigator experience','From forecast to review','Illustrative interface composition based on the current map workflow. All scores, locations and ATM markers below are synthetic examples.')
    x,y,w,h=42,194,511,346
    p.rect(x,y,w,h,WHITE,LINE,8)
    p.rect(x,y,74,h,NAVY,r=8)
    p.text(52,211,'CyberPulse',10,True,WHITE)
    p.text(52,226,'AI / WORKSPACE',5.6,True,'#93b5d0')
    for i,label in enumerate(['Dashboard','Complaints','Money trail','Risk map','Alerts','Investigations']):
        yy=266+i*26
        if label=='Risk map':p.rect(48,yy-5,62,22,'#284964',r=4)
        p.text(55,yy,label,7,label=='Risk map',WHITE if label=='Risk map' else '#c0d0df')
    p.text(52,505,'SYNTHETIC',6,True,'#76d8cc')
    p.rect(116,194,437,36,PALE)
    p.text(128,206,'Geographic intelligence',11,True,NAVY)
    p.badge(440,201,'UI ILLUSTRATION',MINT,TEAL)
    p.rect(128,241,411,24,WHITE,LINE,4)
    p.text(137,248,'Search locality, PIN code, or coordinates',8,False,MUTED)
    p.rect(128,277,251,244,'#eaf0ed',LINE,5)
    # Schematic streets only: intentionally not georeferenced.
    for a,b in [((134,307),(369,337)),((141,372),(370,404)),((137,448),(370,460)),((173,286),(202,513)),((235,285),(256,512)),((309,285),(305,513))]:
        p.line(*a,*b,WHITE,11);p.line(*a,*b,'#cbd6d3',.6)
    p.rect(137,282,155,18,WHITE,r=3)
    p.text(143,287,'SCHEMATIC • NOT GEOREFERENCED',6.5,True,MUTED)
    for cx,cy,risk,fill in [(239,378,1,'#d9e9f6'),(303,435,2,'#e6efde'),(175,453,3,'#f4e9cf')]:
        p.poly([(cx+46*math.cos(i*math.pi/3),cy+46*math.sin(i*math.pi/3)) for i in range(6)],fill,BLUE if risk==1 else '#9caeae',1.4,risk==1)
        p.circle(cx,cy,10,BLUE if risk==1 else TEAL,WHITE,1.5)
        p.text(cx,cy-5,risk,8,True,WHITE,'center')
    for ax,ay,label in [(216,358,'A'),(268,394,'B'),(304,451,'C')]:
        p.rect(ax-4,ay-4,8,8,TEAL,WHITE,1)
        p.text(ax+7,ay-5,'ATM '+label,6.8,True,NAVY)
    p.rect(134,495,238,20,WHITE,r=3)
    p.text(140,501,'Dashed boundary = candidate area, not exact address',6.6,False,MUTED)
    p.rect(389,277,150,244,WHITE,LINE,5)
    p.text(400,289,'Area A',12,True,NAVY)
    p.text(400,307,'Delhi • illustrative example',7.5,False,MUTED)
    p.text(400,330,'MODEL SCORE',6.5,True,MUTED)
    p.text(400,342,'0.67',21,True,TEAL)
    p.text(451,351,'example only',6.5,False,MUTED)
    p.line(400,374,528,374,LINE)
    p.text(400,385,'ESTIMATED WINDOW',6.5,True,MUTED)
    p.text(400,401,'12:00–14:00 IST',10,True,NAVY)
    p.text(400,425,'MODEL INFLUENCES',6.5,True,MUTED)
    for yy,label,length in [(440,'Transaction velocity',86),(457,'Transfer depth',68),(474,'Prior hotspot activity',49)]:
        p.text(400,yy,label,6.7,False,MUTED)
        p.rect(400,yy+9,length,3,TEAL,r=1)
    p.rect(400,495,127,18,BLUE,r=3)
    p.text(463,500,'Prepare alert for review',7,True,WHITE,'center')
    for cx,cy,n in [(286,340,'1'),(278,418,'2'),(532,403,'3'),(531,505,'4')]:
        p.circle(cx,cy,10,WHITE,TEAL,1.5);p.text(cx,cy-5,n,9,True,TEAL,'center')
    p.para(42,551,'Figure 2. Annotated UI illustration, not a captured live session or an evaluated model output. ATM letters and the road layout are fictional. No map-provider data is used.',511,8.3,MUTED)
    notes=[('1','Area, not address','A candidate hexagon narrows the search. Its centre pin is a reference coordinate.'),('2','ATM and PIN context','Verify ATM records separately. A locality or PIN lookup does not locate a suspect.'),('3','Time and explanation','Show the estimated window and influential features; retain uncertainty.'),('4','Human decision','Review before action. The current prototype records alerts internally; external delivery is a pilot requirement.')]
    for i,(n,title,body) in enumerate(notes):
        xx=42+(i%2)*262;yy=600+(i//2)*83
        p.circle(xx+9,yy+8,9,TEAL);p.text(xx+9,yy+3,n,8,True,WHITE,'center')
        p.text(xx+26,yy,title,10,True,NAVY)
        p.para(xx+26,yy+20,body,221,9,MUTED,leading=12.8)

    p=Page(4,'Evidence and readiness');pages.append(p)
    p.heading('03 / Technical credibility','What exists. What needs proof.','The prototype demonstrates the workflow on synthetic data. Pilot readiness requires verified data access, stronger controls and evaluation of the full serving pipeline.')
    p.text(42,204,'WORKING PROTOTYPE',9,True,TEAL)
    p.text(308,204,'REQUIRED BEFORE REAL-DATA USE',9,True,BLUE)
    p.rect(42,225,245,154,MINT,r=8)
    p.rect(308,225,245,154,PALE,r=8)
    for i,t in enumerate(['Complaint and money-trail views','H3 candidate-area ranking','XGBoost scores + temporal estimates','SHAP feature explanations','Internal alert records and audit events']):
        p.circle(57,244+i*25,2,TEAL);p.text(67,238+i*25,t,9.2,False,INK)
    for i,t in enumerate(['Authorised bank / case-data access','Verified identity and access isolation','Point-in-time replay and leakage checks','Missing-link / stale-data qualification','Verified alert delivery and outcome capture']):
        p.circle(323,244+i*25,2,BLUE);p.text(333,238+i*25,t,8.8,False,INK)
    p.text(42,407,'RECORDED SYNTHETIC BASELINE COMPARISON',9,True,TEAL)
    p.text(42,428,'Top-3 cash-out cell hit rate • model card dated 16 September 2026',9,False,MUTED)
    for yy,label,value,color in [(465,'XGBoost model',86.9,BLUE),(508,'Historical hotspot',89.7,TEAL),(551,'Logistic regression',89.7,'#647e93')]:
        p.text(42,yy,label,10,True,NAVY)
        p.rect(176,yy,301,13,PALE,r=3)
        p.rect(176,yy,301*value/100,13,color,r=3)
        p.text(494,yy-1,f'{value:.1f}%',11,True,color)
    p.para(42,582,'The recorded XGBoost result does not exceed the simpler baselines. These numbers recover planted synthetic patterns; they are not field accuracy or proof of operational value. [4]',511,10,INK)
    p.rect(42,650,511,112,PALE,r=8)
    p.text(57,665,'EVALUATE THE PIPELINE THAT OFFICERS WILL SEE',9,True,NAVY)
    p.para(57,688,'Serving combines model output with other ranking terms. Evaluate that final ranking, its candidate generator and its time window together. Enforce a prediction cutoff on historical aggregates before replay; the current hotspot query does not yet apply one. [5]',481,9.5,MUTED)

    p=Page(5,'Pilot design');pages.append(p)
    p.heading('04 / Evaluation plan','An eight-week gated pilot','Proposed eight-week evaluation after data-access approval. Timing, cohort size, partner ownership and numerical thresholds must be agreed before evaluation begins.')
    stages=[('01','Weeks 1–2','Readiness','Approve data scope; verify identity, hosting, retention and prediction cutoffs.','Gate: replay-safe dataset'),('02','Weeks 3–4','Historical replay','Use time-ordered held-out cases. Compare the full pipeline with simple baselines.','Gate: agreed offline targets'),('03','Weeks 5–7','Shadow testing','Log predictions and officer review without automated operational action.','Gate: useful, timely leads'),('04','Week 8','Joint review','Assess benefit, alert burden and failures. Decide whether to extend or stop.','Gate: documented decision')]
    for i,(n,time,title,body,gate) in enumerate(stages):
        xx=42+(i%2)*262;yy=198+(i//2)*135
        p.rect(xx,yy,249,121,PALE,LINE,7)
        p.text(xx+13,yy+12,n,18,True,TEAL)
        p.text(xx+44,yy+12,title,11,True,NAVY)
        p.text(xx+44,yy+29,time,8,False,MUTED)
        p.para(xx+13,yy+48,body,223,8.8,MUTED,leading=12.2)
        p.text(xx+13,yy+102,gate,8,True,TEAL)
    p.text(42,480,'PILOT SCORECARD',9,True,TEAL)
    p.rect(42,501,511,28,NAVY,r=4)
    p.text(54,510,'MEASURE',8,True,WHITE);p.text(215,510,'WHAT THE PILOT MUST ESTABLISH',8,True,WHITE)
    rows=[('Candidate recall','True cell included anywhere in the candidate set.'),('Top-3 / joint hit rate','Location ranking and location-plus-time success vs baseline.'),('Delivered lead time','Withdrawal time minus actual investigator availability time.'),('Investigator workload','False alerts per case/day and time spent reviewing leads.'),('Data / outcome coverage','Missing links, stale inputs and unobservable cash-out outcomes.')]
    for i,(label,body) in enumerate(rows):
        yy=529+i*33
        if i%2==0:p.rect(42,yy,511,33,PALE)
        p.text(54,yy+10,label,8.9,True,NAVY)
        p.para(215,yy+8,body,326,8.7,MUTED,leading=11)
    p.rect(42,711,511,63,MINT,r=7)
    p.para(56,725,'Pre-register thresholds and an alert budget; report uncertainty and all eligible cases, including candidate misses. Historical replay estimates potential lead time. Only prospective testing measures actual delivery and operational usefulness.',482,9,INK,leading=12.5)

    p=Page(6,'Data, ask and sources');pages.append(p)
    p.heading('05 / Partnership request','A bounded, reviewable next step','Request a technical review with RBIH and introductions to suitable bank and law-enforcement partners for a controlled evaluation. No institutional endorsement is implied.')
    p.text(42,201,'MINIMUM DATA AND GOVERNANCE AGREEMENT',9,True,TEAL)
    p.para(42,224,'Request only the approved fields needed for evaluation: pseudonymous case/account links, transaction amounts and event/availability times, complaint timestamps, historical ATM coordinates, and linked withdrawal outcomes. Account identifiers must remain joinable under the agreed pseudonymisation scheme.',511,10,MUTED)
    p.para(42,303,'Before access: agree the institutional host, authorised users, isolation controls, audit logging, retention/deletion terms and outcome ownership. Missing outcomes remain unknown; they must not be treated as successful predictions or confirmed negatives.',511,10,MUTED)
    p.rect(42,376,511,89,NAVY,r=8)
    p.text(57,391,'SUCCESS MUST BE OBSERVABLE',8.5,True,'#72d5cd')
    p.para(57,414,'Proceed only if the agreed evaluation shows useful improvement at an acceptable review burden. Higher recovery or arrest rates remain hypotheses for a later controlled operational study.',480,10.5,WHITE,leading=15)
    p.text(42,489,'SOURCES AND IMPLEMENTATION EVIDENCE',9,True,TEAL)
    refs=[
      ('1','MHA / PIB, 17 March 2026 — CFCFRMS context.','Over Rs. 8,690 crore saved as of 31 January 2026; not a CyberPulse result.','https://www.pib.gov.in/PressReleasePage.aspx?PRID=2241336&lang=1&reg=1'),
      ('2','MHA / PIB, 12 May 2026 — I4C–RBIH MoU.','Supports mule-account intelligence sharing and fraud-risk collaboration.','https://www.pib.gov.in/PressReleasePage.aspx?PRID=2260277&lang=1&reg=3'),
      ('3','RBIH — MuleHunter.ai project overview.','Existing mule-account detection capability; referenced for operational fit.','https://rbihub.in/projects/mulehunter'),
      ('4','CyberPulse model_card.json — 16 September 2026.','apps/ml-service/models/model_card.json; synthetic data, seed 26184.',None),
      ('5','CyberPulse implementation review — 18 September 2026.','hotspotService.ts, alertService.ts, services/lib/auth.ts and engine/temporal.py.',None)
    ]
    yy=512
    for n,title,body,url in refs:
        p.text(42,yy,f'[{n}]',8.4,True,TEAL)
        p.text(62,yy,title,8.5,True,BLUE if url else NAVY,url=url)
        p.para(62,yy+15,body,491,8.2,MUTED,leading=11)
        yy+=43
    p.line(42,738,553,738,LINE)
    p.text(42,752,'Prepared by '+TEAM,9.5,True,NAVY)
    p.text(42,768,INSTITUTION,8.5,False,MUTED)
    return pages


def main():
    pages=build()
    ROOT.mkdir(exist_ok=True)
    preview=ROOT/'previews';preview.mkdir(exist_ok=True)
    out=ROOT/'CyberPulse_AI_RBIH_Pilot_Proposal_Revised.pdf'
    PDF().save(pages,out)
    for p in pages:
        PDF().save([p],preview/f'page-{p.number}.pdf')
    body='\n'.join(f'<section class="page" aria-labelledby="page-{p.number}-transcript">{p.svg_doc()}</section>' for p in pages)
    doc='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CyberPulse AI | RBIH Pilot Proposal</title><style>body{margin:0;background:#dfe7ed;font-family:Arial,sans-serif}.tools{padding:16px;text-align:center;color:#22374c}.tools button{background:#132c46;color:white;padding:10px 20px;border:0;border-radius:6px;cursor:pointer}.page{width:min(794px,100%);margin:24px auto;box-shadow:0 6px 30px #132c4620;background:white}.page svg{display:block;width:100%;height:auto}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@page{size:A4;margin:0}@media print{body{background:white}.tools{display:none}.page{width:210mm;height:297mm;margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}</style><div class="tools"><button onclick="window.print()">Print / Save PDF</button><p>Six-page proposal • vector diagrams • all dashboard values illustrative</p></div>'''+body+'</html>'
    (ROOT/'CyberPulse_AI_RBIH_Pilot_Proposal_Revised.html').write_text(doc)
    all_text='\n\n'.join(f'PAGE {p.number}: {p.section}\n'+'\n'.join(t[4] for t in p.text_bounds) for p in pages)
    (ROOT/'proposal-text.txt').write_text(all_text)
    issues=[]
    for p in pages:
        for x,y,w,h,t in p.text_bounds:
            if x < 0 or x+w > W+.2 or y < 0 or y+h > H:
                issues.append({'page':p.number,'text':t,'bounds':[x,y,w,h]})
    receipt_path = ROOT/'pdf-checks.json'
    previous = json.loads(receipt_path.read_text()) if receipt_path.exists() else {}
    pdf_sha256 = hashlib.sha256(out.read_bytes()).hexdigest()
    prior_hash = previous.get('pdf_sha256')
    if prior_hash == pdf_sha256:
        manual_review = previous.get('manual_review')
        if manual_review is None and previous.get('rendered_page_review'):
            manual_review = {'pdf_sha256': pdf_sha256, 'status': previous['rendered_page_review']}
        if manual_review is None:
            manual_review = {'pdf_sha256': pdf_sha256, 'status': 'pending: visual review required'}
    else:
        manual_review = {'pdf_sha256': pdf_sha256, 'status': 'pending: PDF changed; visual review required'}
    same_pdf = prior_hash == pdf_sha256
    receipt={'pages':len(pages),'page_size':'A4 portrait','fonts':'Embedded Arial regular and bold','dashboard':'Illustrative vector UI; synthetic values; not a screenshot','text_bounds_issues':issues,'external_source_links':sum(len(p.links) for p in pages),'pdf_bytes':out.stat().st_size,'team':TEAM,'institution_as_supplied':INSTITUTION,'pdf_sha256':pdf_sha256,'structural_checks':previous.get('structural_checks', 'pending') if same_pdf else 'pending','rendered_page_review':previous.get('rendered_page_review', 'pending') if same_pdf else 'pending','manual_review':manual_review}
    receipt_path.write_text(json.dumps(receipt,indent=2))
    print(json.dumps(receipt,indent=2))
    if issues:raise SystemExit(1)


if __name__=='__main__':main()
