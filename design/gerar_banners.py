"""
Gera os banners da tela inicial no mesmo estilo do banner original do Figma:
metade vermelha com a palavra "capacete" em marca d'água, metade preta com
textura de chapa, tipografia pesada em itálico, corações 3D e logo quadriculado.
Uso: python design/gerar_banners.py  (lê as fotos em backend/public/img-originais)
"""
import math
import os
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOTOS = os.path.join(RAIZ, 'backend', 'public', 'img-originais')
SAIDA = os.path.join(RAIZ, 'app', 'assets', 'banners')
W, H = 2034, 654
PASTA_FONTES = r'C:\Windows\Fonts'
VERMELHO = (227, 6, 19)
BRANCO = (255, 255, 255)
PRETO = (12, 12, 12)


def fonte(nome, t):
    return ImageFont.truetype(os.path.join(PASTA_FONTES, nome), t)


def pesada_it(t): return fonte('seguibli.ttf', t)   # Segoe UI Black Italic
def pesada(t): return fonte('seguibl.ttf', t)
def leve_it(t): return fonte('seguili.ttf', t)


# ---------- fundos ----------
def fundo_vermelho(w, h):
    im = Image.new('RGB', (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            k = max(0, 1 - math.hypot(x - w * 0.35, y - h * 0.4) / (w * 0.8))
            px[x, y] = (int(200 + 40 * k), int(8 + 26 * k), int(18 + 22 * k))
    d = ImageDraw.Draw(im)
    f = pesada(190)
    for i, y in enumerate(range(-60, h, 118)):
        d.text((-((i * 260) % 520), y), 'capacete' * 4, font=f, fill=(212, 18, 28))
    return im


def fundo_chapa(w, h):
    im = Image.new('RGB', (w, h), (20, 20, 20))
    d = ImageDraw.Draw(im)
    p = 44
    for gy, y in enumerate(range(0, h + p, p)):
        for gx, x in enumerate(range(0, w + p, p)):
            a = math.radians(45 if (gx + gy) % 2 else -45)
            dx, dy = math.cos(a) * 11, math.sin(a) * 11
            d.line((x - dx + 1, y - dy + 1, x + dx + 1, y + dy + 1), fill=(10, 10, 10), width=7)
            d.line((x - dx, y - dy, x + dx, y + dy), fill=(44, 44, 44), width=7)
    v = Image.new('L', (w, h), 0)
    ImageDraw.Draw(v).ellipse((-w * .2, -h * .6, w * 1.1, h * 1.2), fill=255)
    im = Image.composite(im, Image.new('RGB', (w, h), (6, 6, 6)), v.filter(ImageFilter.GaussianBlur(160)))
    g = Image.new('L', (w, h), 0)
    ImageDraw.Draw(g).ellipse((w * .55, h * .7, w * 1.3, h * 1.6), fill=150)
    return Image.composite(Image.new('RGB', (w, h), (150, 8, 14)), im, g.filter(ImageFilter.GaussianBlur(120)))


def base(vermelho_esquerda=True, corte=1040, inclinacao=90):
    """Divide o banner em diagonal: vermelho de um lado, chapa preta do outro."""
    red, chapa = fundo_vermelho(W, H), fundo_chapa(W, H)
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([(0, 0), (corte + inclinacao, 0), (corte - inclinacao, H), (0, H)], fill=255)
    return Image.composite(red, chapa, m) if vermelho_esquerda else Image.composite(chapa, red, m)


# ---------- elementos ----------
def coracao(r):
    """Esfera vermelha 3D com coração branco (motivo do banner original)."""
    s = r * 2 + 60
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sombra = Image.new('L', (s, s), 0)
    ImageDraw.Draw(sombra).ellipse((30, 44, 30 + 2 * r, 44 + 2 * r), fill=140)
    im.paste((0, 0, 0, 255), (0, 0), sombra.filter(ImageFilter.GaussianBlur(14)))
    esf = Image.new('RGB', (2 * r, 2 * r))
    px = esf.load()
    for y in range(2 * r):
        for x in range(2 * r):
            k = max(0, 1 - math.hypot(x - r * .7, y - r * .6) / (r * 1.55))
            px[x, y] = (int(150 + 105 * k), int(70 * k ** 2), int(10 + 70 * k ** 2))
    m = Image.new('L', (2 * r, 2 * r), 0)
    ImageDraw.Draw(m).ellipse((0, 0, 2 * r - 1, 2 * r - 1), fill=255)
    im.paste(esf, (30, 30), m)
    c = Image.new('L', (2 * r, 2 * r), 0)
    dc = ImageDraw.Draw(c)
    cx, cy, a = r * 1.08, r * 1.0, r * .32
    dc.ellipse((cx - 2 * a, cy - 1.6 * a, cx, cy + .4 * a), fill=255)
    dc.ellipse((cx, cy - 1.6 * a, cx + 2 * a, cy + .4 * a), fill=255)
    dc.polygon([(cx - 1.93 * a, cy - .2 * a), (cx + 1.93 * a, cy - .2 * a), (cx, cy + 2.1 * a)], fill=255)
    c = c.rotate(-12, resample=Image.BICUBIC, center=(cx, cy))
    im.paste((120, 0, 10, 255), (36, 40), ImageChops.multiply(c.filter(ImageFilter.GaussianBlur(8)), m))
    im.paste((255, 255, 255, 255), (30, 30), c)
    return im


def recorte(arquivo):
    """Separa o capacete do fundo (preenchimento a partir das bordas) e devolve RGBA."""
    im = Image.open(os.path.join(FOTOS, arquivo)).convert('RGB')
    w, h = im.size
    p = im.load()
    m = Image.new('L', (w, h), 255)
    mp = m.load()
    q = deque()
    for x in range(w):
        q += [(x, 0), (x, h - 1)]
    for y in range(h):
        q += [(0, y), (w - 1, y)]
    vis = set(q)
    while q:
        x, y = q.popleft()
        mp[x, y] = 0
        c = p[x, y]
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= n[0] < w and 0 <= n[1] < h and n not in vis:
                k = p[n]
                if max(abs(k[i] - c[i]) for i in range(3)) <= 4 and max(k) - min(k) < 12:
                    vis.add(n)
                    q.append(n)
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(m)
    return im.crop(m.point(lambda v: 255 if v > 128 else 0).getbbox())


def cola_produto(banner, rgba, cx, base_y, altura):
    e = altura / rgba.height
    rgba = rgba.resize((int(rgba.width * e), altura), Image.LANCZOS)
    x, y = int(cx - rgba.width / 2), base_y - altura
    s = Image.new('L', banner.size, 0)
    ImageDraw.Draw(s).ellipse((x + rgba.width * .1, base_y - 30, x + rgba.width * .9, base_y + 26), fill=200)
    banner.paste((0, 0, 0), (0, 0), s.filter(ImageFilter.GaussianBlur(22)))
    banner.paste(rgba, (x, y), rgba)


def logo(banner, x, y, largura):
    lg = Image.open(os.path.join(RAIZ, 'app', 'assets', 'logo.png')).convert('RGB')
    lg = lg.resize((largura, int(lg.height * largura / lg.width)), Image.LANCZOS)
    area = banner.crop((x, y, x + lg.width, y + lg.height))
    banner.paste(ImageChops.screen(area, lg), (x, y))  # o fundo preto do logo some


def texto(d, xy, s, f, cor, ancora='la', sombra=False):
    if sombra:
        d.text((xy[0] + 4, xy[1] + 6), s, font=f, fill=(90, 0, 6), anchor=ancora)
    d.text(xy, s, font=f, fill=cor, anchor=ancora)


def caixa(banner, box, raio=26, cor=VERMELHO):
    s = Image.new('L', banner.size, 0)
    ImageDraw.Draw(s).rounded_rectangle((box[0] + 8, box[1] + 14, box[2] + 8, box[3] + 14), raio, fill=160)
    banner.paste((0, 0, 0), (0, 0), s.filter(ImageFilter.GaussianBlur(16)))
    ImageDraw.Draw(banner).rounded_rectangle(box, raio, fill=cor)


def pilula(banner, x, y, rotulo, cor_fundo=(30, 30, 30), cor_texto=BRANCO, t=40):
    d = ImageDraw.Draw(banner)
    f = pesada(t)
    w = d.textlength(rotulo, font=f)
    d.rounded_rectangle((x, y, x + w + 70, y + t + 34), (t + 34) // 2, fill=cor_fundo)
    d.text((x + 35, y + 17 + t / 2), rotulo, font=f, fill=cor_texto, anchor='lm')


def cola(banner, img, x, y):
    banner.paste(img, (x, y), img)


# ---------- banners ----------
def fim_texto(d, s, f, x):
    """Coordenada x onde o texto termina — usada para nunca sobrepor produto e texto."""
    return x + d.textlength(s, font=f)


def banner_ofertas(neon):
    b = base(corte=1100)
    d = ImageDraw.Draw(b)
    texto(d, (110, 110), 'Ofertas', pesada_it(150), PRETO)
    texto(d, (120, 290), 'de até', pesada_it(92), BRANCO)
    f = pesada_it(180)
    texto(d, (100, 380), '56% off', f, BRANCO, sombra=True)
    x = fim_texto(d, '56% off', f, 100)
    cola(b, coracao(62), int(x) + 10, 40)
    cola_produto(b, neon, int(x) + 250, 610, 460)
    caixa(b, (1400, 160, 1730, 320))
    d = ImageDraw.Draw(b)
    texto(d, (1700, 176), 'Descontos em', leve_it(40), BRANCO, 'ra')
    texto(d, (1700, 222), 'modelos', pesada_it(44), BRANCO, 'ra')
    texto(d, (1700, 268), 'selecionados', pesada_it(44), BRANCO, 'ra')
    pilula(b, 1408, 360, 'Ver ofertas  ›')
    logo(b, 1760, 200, 240)
    cola(b, coracao(48), 1800, 430)
    return b


def banner_boas_vindas(american):
    b = base(corte=1060)
    d = ImageDraw.Draw(b)
    f1, f3 = pesada_it(120), pesada_it(190)
    texto(d, (110, 100), 'Bem-vindo', f1, PRETO)
    texto(d, (116, 235), 'à Zentor', pesada_it(92), BRANCO)
    texto(d, (100, 340), '10% off', f3, BRANCO, sombra=True)
    x = max(fim_texto(d, 'Bem-vindo', f1, 110), fim_texto(d, '10% off', f3, 100))
    cola_produto(b, american, int(x) + 230, 610, 430)
    cola(b, coracao(58), int(x) + 40, 10)
    x0, y0, x1, y1 = 1330, 170, 1760, 400  # cupom em forma de ticket, borda tracejada
    caixa(b, (x0, y0, x1, y1), 22, (24, 24, 24))
    d = ImageDraw.Draw(b)
    for xx in range(x0 + 24, x1 - 30, 34):
        d.line((xx, y0 + 16, xx + 18, y0 + 16), fill=BRANCO, width=3)
        d.line((xx, y1 - 16, xx + 18, y1 - 16), fill=BRANCO, width=3)
    for yy in range(y0 + 24, y1 - 30, 34):
        d.line((x0 + 16, yy, x0 + 16, yy + 18), fill=BRANCO, width=3)
        d.line((x1 - 16, yy, x1 - 16, yy + 18), fill=BRANCO, width=3)
    meio = (x0 + x1) / 2
    texto(d, (meio, 225), 'use o cupom', leve_it(40), (220, 220, 220), 'mm')
    texto(d, (meio, 290), 'BEMVINDO10', pesada(54), BRANCO, 'mm')
    texto(d, (meio, 350), 'no carrinho', leve_it(36), (190, 190, 190), 'mm')
    logo(b, 1790, 225, 220)
    return b


def banner_lancamento(american):
    b = base(vermelho_esquerda=False, corte=1120)
    d = ImageDraw.Draw(b)
    pilula(b, 110, 90, 'LANÇAMENTO', VERMELHO, t=40)
    texto(d, (110, 180), 'Zentor', pesada_it(110), BRANCO)
    texto(d, (100, 280), 'American', pesada_it(170), BRANCO)
    texto(d, (114, 470), 'Viseira dupla  ·  Inmetro', leve_it(50), (220, 220, 220))
    cola(b, coracao(70), 1830, 50)
    cola_produto(b, american, 1520, 620, 540)
    cola(b, coracao(56), 1820, 440)
    pilula(b, 640, 470, 'Conhecer  ›', VERMELHO, t=44)
    return b


if __name__ == '__main__':
    os.makedirs(SAIDA, exist_ok=True)
    neon, american = recorte('neon.png'), recorte('american.png')
    for nome, img in [('ofertas', banner_ofertas(neon)),
                      ('boas-vindas', banner_boas_vindas(american)),
                      ('lancamento-american', banner_lancamento(american))]:
        img.save(os.path.join(SAIDA, f'{nome}.png'), optimize=True)
        print('ok', nome)
