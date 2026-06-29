from pathlib import Path
import os
import re

import numpy as np
import torch
from PIL import Image, ImageColor, ImageDraw, ImageFont


NODE_DIR = Path(__file__).resolve().parent


class CustomCardTextComposer:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "headline": ("STRING", {"multiline": True, "default": ""}),
                "body": ("STRING", {"multiline": True, "default": ""}),
                "headline_font": ("STRING", {"default": "georgia.ttf"}),
                "body_font": ("STRING", {"default": "georgia.ttf"}),
                "headline_font_size": ("INT", {"default": 54, "min": 8, "max": 240, "step": 1}),
                "body_font_size": ("INT", {"default": 28, "min": 8, "max": 180, "step": 1}),
                "min_font_size": ("INT", {"default": 16, "min": 6, "max": 80, "step": 1}),
                "artwork_guard_x": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 1}),
                "artwork_guard_y": ("INT", {"default": 0, "min": 0, "max": 8192, "step": 1}),
                "artwork_guard_width": ("INT", {"default": 1, "min": 1, "max": 8192, "step": 1}),
                "artwork_guard_height": ("INT", {"default": 1, "min": 1, "max": 8192, "step": 1}),
                "artwork_guard_color": ("STRING", {"default": ""}),
                "artwork_guard_opacity": ("FLOAT", {"default": 0.0, "min": 0.0, "max": 1.0, "step": 0.01}),
                "artwork_guard_radius": ("INT", {"default": 0, "min": 0, "max": 512, "step": 1}),
                "artwork_guard_style": (["none", "box", "panel"], {"default": "none"}),
                "headline_box_x": ("INT", {"default": 80, "min": 0, "max": 8192, "step": 1}),
                "headline_box_y": ("INT", {"default": 120, "min": 0, "max": 8192, "step": 1}),
                "headline_box_width": ("INT", {"default": 800, "min": 1, "max": 8192, "step": 1}),
                "headline_box_height": ("INT", {"default": 260, "min": 1, "max": 8192, "step": 1}),
                "headline_box_background_color": ("STRING", {"default": ""}),
                "headline_box_background_padding": ("INT", {"default": 0, "min": 0, "max": 512, "step": 1}),
                "headline_box_background_radius": ("INT", {"default": 32, "min": 0, "max": 512, "step": 1}),
                "headline_box_background_opacity": ("FLOAT", {"default": 0.96, "min": 0.0, "max": 1.0, "step": 0.01}),
                "headline_box_background_style": (["text-hug", "box", "panel"], {"default": "text-hug"}),
                "body_box_x": ("INT", {"default": 100, "min": 0, "max": 8192, "step": 1}),
                "body_box_y": ("INT", {"default": 460, "min": 0, "max": 8192, "step": 1}),
                "body_box_width": ("INT", {"default": 760, "min": 1, "max": 8192, "step": 1}),
                "body_box_height": ("INT", {"default": 520, "min": 1, "max": 8192, "step": 1}),
                "body_box_background_color": ("STRING", {"default": ""}),
                "body_box_background_padding": ("INT", {"default": 0, "min": 0, "max": 512, "step": 1}),
                "body_box_background_radius": ("INT", {"default": 32, "min": 0, "max": 512, "step": 1}),
                "body_box_background_opacity": ("FLOAT", {"default": 0.96, "min": 0.0, "max": 1.0, "step": 0.01}),
                "body_box_background_style": (["text-hug", "box", "panel"], {"default": "text-hug"}),
                "alignment": (["left", "center", "right"], {"default": "center"}),
                "headline_vertical_alignment": (["top", "middle", "bottom"], {"default": "middle"}),
                "body_vertical_alignment": (["top", "middle", "bottom"], {"default": "middle"}),
                "headline_fill_color": ("STRING", {"default": "#282923"}),
                "body_fill_color": ("STRING", {"default": "#4f432a"}),
                "headline_stroke_color": ("STRING", {"default": "#fff6df"}),
                "body_stroke_color": ("STRING", {"default": "#fff6df"}),
                "headline_stroke_width": ("FLOAT", {"default": 2.0, "min": 0.0, "max": 24.0, "step": 0.25}),
                "body_stroke_width": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 18.0, "step": 0.25}),
                "headline_line_spacing": ("INT", {"default": 8, "min": -24, "max": 96, "step": 1}),
                "body_line_spacing": ("INT", {"default": 6, "min": -24, "max": 96, "step": 1}),
                "debug_boxes": ("BOOLEAN", {"default": False}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "compose"
    CATEGORY = "CustomCard/Typography"
    DESCRIPTION = "Draws exact greeting-card headline and body copy into explicit safe boxes with wrapping and shrink-to-fit."

    def compose(
        self,
        image,
        headline,
        body,
        headline_font,
        body_font,
        headline_font_size,
        body_font_size,
        min_font_size,
        artwork_guard_x,
        artwork_guard_y,
        artwork_guard_width,
        artwork_guard_height,
        artwork_guard_color,
        artwork_guard_opacity,
        artwork_guard_radius,
        artwork_guard_style,
        headline_box_x,
        headline_box_y,
        headline_box_width,
        headline_box_height,
        headline_box_background_color,
        headline_box_background_padding,
        headline_box_background_radius,
        headline_box_background_opacity,
        headline_box_background_style,
        body_box_x,
        body_box_y,
        body_box_width,
        body_box_height,
        body_box_background_color,
        body_box_background_padding,
        body_box_background_radius,
        body_box_background_opacity,
        body_box_background_style,
        alignment,
        headline_vertical_alignment,
        body_vertical_alignment,
        headline_fill_color,
        body_fill_color,
        headline_stroke_color,
        body_stroke_color,
        headline_stroke_width,
        body_stroke_width,
        headline_line_spacing,
        body_line_spacing,
        debug_boxes,
    ):
        frames = image if len(image.shape) == 4 else image.unsqueeze(0)
        rendered = []
        for frame in frames:
            canvas = _tensor_to_pil(frame)
            canvas = _draw_artwork_guard(
                canvas=canvas,
                box=(artwork_guard_x, artwork_guard_y, artwork_guard_width, artwork_guard_height),
                fill=artwork_guard_color,
                opacity=artwork_guard_opacity,
                radius=artwork_guard_radius,
                style=artwork_guard_style,
            )
            canvas = _draw_box_background(
                canvas=canvas,
                text=headline,
                box=(headline_box_x, headline_box_y, headline_box_width, headline_box_height),
                fill=headline_box_background_color,
                padding=headline_box_background_padding,
                radius=headline_box_background_radius,
                opacity=headline_box_background_opacity,
                style=headline_box_background_style,
                font_name=headline_font,
                font_size=headline_font_size,
                min_font_size=min_font_size,
                alignment=alignment,
                vertical_alignment=headline_vertical_alignment,
                stroke_width=headline_stroke_width,
                line_spacing=headline_line_spacing,
            )
            canvas = _draw_box_background(
                canvas=canvas,
                text=body,
                box=(body_box_x, body_box_y, body_box_width, body_box_height),
                fill=body_box_background_color,
                padding=body_box_background_padding,
                radius=body_box_background_radius,
                opacity=body_box_background_opacity,
                style=body_box_background_style,
                font_name=body_font,
                font_size=body_font_size,
                min_font_size=min_font_size,
                alignment=alignment,
                vertical_alignment=body_vertical_alignment,
                stroke_width=body_stroke_width,
                line_spacing=body_line_spacing,
            )
            draw = ImageDraw.Draw(canvas)
            _draw_text_box(
                draw=draw,
                image_size=canvas.size,
                text=headline,
                font_name=headline_font,
                font_size=headline_font_size,
                min_font_size=min_font_size,
                box=(headline_box_x, headline_box_y, headline_box_width, headline_box_height),
                alignment=alignment,
                vertical_alignment=headline_vertical_alignment,
                fill=headline_fill_color,
                stroke_fill=headline_stroke_color,
                stroke_width=headline_stroke_width,
                line_spacing=headline_line_spacing,
                debug=debug_boxes,
            )
            _draw_text_box(
                draw=draw,
                image_size=canvas.size,
                text=body,
                font_name=body_font,
                font_size=body_font_size,
                min_font_size=min_font_size,
                box=(body_box_x, body_box_y, body_box_width, body_box_height),
                alignment=alignment,
                vertical_alignment=body_vertical_alignment,
                fill=body_fill_color,
                stroke_fill=body_stroke_color,
                stroke_width=body_stroke_width,
                line_spacing=body_line_spacing,
                debug=debug_boxes,
            )
            rendered.append(_pil_to_tensor(canvas))
        return (torch.stack(rendered, dim=0),)


def _tensor_to_pil(frame):
    array = frame.detach().cpu().numpy()
    array = np.clip(array * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(array).convert("RGB")


def _pil_to_tensor(image):
    array = np.asarray(image.convert("RGB")).astype(np.float32) / 255.0
    return torch.from_numpy(array)


def _draw_text_box(
    draw,
    image_size,
    text,
    font_name,
    font_size,
    min_font_size,
    box,
    alignment,
    vertical_alignment,
    fill,
    stroke_fill,
    stroke_width,
    line_spacing,
    debug,
):
    normalized = _normalize_text(text)
    x, y, width, height = _clip_box(image_size, box)
    if debug:
        draw.rectangle((x, y, x + width, y + height), outline="#00aaff", width=2)
    if not normalized or width <= 0 or height <= 0:
        return

    stroke = max(0, int(round(float(stroke_width or 0))))
    spacing = int(line_spacing or 0)
    font, lines, measurements, total_height = _fit_text(
        draw=draw,
        text=normalized,
        font_name=font_name,
        font_size=int(font_size or min_font_size),
        min_font_size=int(min_font_size or 12),
        max_width=width,
        max_height=height,
        stroke_width=stroke,
        line_spacing=spacing,
    )
    fill_color = _parse_color(fill, "#282923")
    stroke_color = _parse_color(stroke_fill, "#fff6df")
    cursor_y = _aligned_y(y, height, total_height, vertical_alignment)

    for line, measurement in zip(lines, measurements):
        line_width = measurement["width"]
        bbox = measurement["bbox"]
        cursor_x = _aligned_x(x, width, line_width, alignment)
        draw.text(
            (cursor_x - bbox[0], cursor_y - bbox[1]),
            line,
            font=font,
            fill=fill_color,
            stroke_width=stroke,
            stroke_fill=stroke_color,
        )
        cursor_y += measurement["height"] + spacing


def _draw_box_background(
    canvas,
    text,
    box,
    fill,
    padding,
    radius,
    opacity,
    style,
    font_name,
    font_size,
    min_font_size,
    alignment,
    vertical_alignment,
    stroke_width,
    line_spacing,
):
    if not _normalize_text(text):
        return canvas
    color = _parse_optional_color(fill)
    if color is None:
        return canvas
    image_size = canvas.size
    x, y, width, height = _clip_box(image_size, box)
    pad = max(0, int(round(float(padding or 0))))
    if str(style or "").strip().lower() in {"text-hug", "hug", "soft", "soft-hug"}:
        measure_draw = ImageDraw.Draw(canvas)
        stroke = max(0, int(round(float(stroke_width or 0))))
        spacing = int(line_spacing or 0)
        _font, _lines, measurements, total_height = _fit_text(
            draw=measure_draw,
            text=_normalize_text(text),
            font_name=font_name,
            font_size=int(font_size or min_font_size),
            min_font_size=int(min_font_size or 12),
            max_width=width,
            max_height=height,
            stroke_width=stroke,
            line_spacing=spacing,
        )
        text_width = min(width, max((item["width"] for item in measurements), default=width))
        text_height = min(height, total_height)
        left = _aligned_x(x, width, text_width, alignment) - pad
        top = _aligned_y(y, height, text_height, vertical_alignment) - pad
        right = left + text_width + pad * 2
        bottom = top + text_height + pad * 2
    else:
        left = x - pad
        top = y - pad
        right = x + width + pad
        bottom = y + height + pad
    rect = (
        max(0, int(round(left))),
        max(0, int(round(top))),
        min(image_size[0], int(round(right))),
        min(image_size[1], int(round(bottom))),
    )
    return _draw_safe_surface(canvas, rect, color, radius, opacity, style)


def _draw_artwork_guard(canvas, box, fill, opacity, radius, style):
    if str(style or "").strip().lower() in {"", "none"}:
        return canvas
    color = _parse_optional_color(fill)
    if color is None:
        return canvas
    rect = _box_rect(canvas.size, box, padding=0)
    if _is_full_canvas_guard(canvas.size, rect, opacity):
        return canvas
    return _draw_safe_surface(canvas, rect, color, radius, opacity, style)


def _is_full_canvas_guard(image_size, rect, opacity):
    if _bounded_opacity(opacity) < 0.5:
        return False
    left, top, right, bottom = rect
    image_width, image_height = image_size
    if image_width <= 0 or image_height <= 0:
        return False
    area_ratio = ((right - left) * (bottom - top)) / float(image_width * image_height)
    touches_all_edges = left <= 0 and top <= 0 and right >= image_width and bottom >= image_height
    return touches_all_edges or area_ratio >= 0.9


def _draw_safe_surface(canvas, rect, color, radius, opacity, style):
    rendered = _draw_safe_field(canvas, rect, color, radius, opacity)
    if str(style or "").strip().lower() != "panel":
        return rendered
    left, top, right, bottom = rect
    if right <= left or bottom <= top:
        return rendered
    rounded_radius = max(0, min(int(round(float(radius or 0))), (right - left) // 2, (bottom - top) // 2))
    line_width = max(2, min(8, int(round((right - left) * 0.008))))
    outer, inner = _panel_edge_colors(color)
    overlay = Image.new("RGBA", rendered.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((left, top, right, bottom), radius=rounded_radius, outline=outer, width=line_width)
    inset = max(line_width * 2, 6)
    if right - left > inset * 2 and bottom - top > inset * 2:
        inner_radius = max(0, rounded_radius - inset)
        draw.rounded_rectangle(
            (left + inset, top + inset, right - inset, bottom - inset),
            radius=inner_radius,
            outline=inner,
            width=max(1, line_width // 2),
        )
    return Image.alpha_composite(rendered.convert("RGBA"), overlay).convert("RGB")


def _box_rect(image_size, box, padding=0):
    x, y, width, height = _clip_box(image_size, box)
    pad = max(0, int(round(float(padding or 0))))
    return (
        max(0, x - pad),
        max(0, y - pad),
        min(image_size[0], x + width + pad),
        min(image_size[1], y + height + pad),
    )


def _draw_safe_field(canvas, rect, color, radius, opacity):
    left, top, right, bottom = rect
    if right <= left or bottom <= top:
        return canvas
    alpha = int(round(_bounded_opacity(opacity) * 255))
    if alpha <= 0:
        return canvas
    rounded_radius = max(0, min(int(round(float(radius or 0))), (right - left) // 2, (bottom - top) // 2))
    if alpha >= 255:
        draw = ImageDraw.Draw(canvas)
        draw.rounded_rectangle((left, top, right, bottom), radius=rounded_radius, fill=color)
        return canvas
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((left, top, right, bottom), radius=rounded_radius, fill=(*color, alpha))
    return Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")


def _panel_edge_colors(color):
    luminance = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722
    if luminance < 96:
        return (255, 246, 223, 90), (255, 246, 223, 34)
    return (74, 67, 48, 70), (255, 255, 255, 58)


def _fit_text(draw, text, font_name, font_size, min_font_size, max_width, max_height, stroke_width, line_spacing):
    start_size = max(int(min_font_size), int(font_size))
    floor_size = max(6, min(int(min_font_size), start_size))
    best = None
    for size in range(start_size, floor_size - 1, -1):
        font = _load_font(font_name, size)
        lines = _wrap_text(draw, text, font, max_width, stroke_width)
        measurements, total_height = _measure_lines(draw, lines, font, stroke_width, line_spacing)
        widest = max((item["width"] for item in measurements), default=0)
        best = (font, lines, measurements, total_height)
        if widest <= max_width and total_height <= max_height:
            return best
    return best


def _wrap_text(draw, text, font, max_width, stroke_width):
    lines = []
    for paragraph in text.split("\n"):
        paragraph = paragraph.strip()
        if not paragraph:
            lines.append("")
            continue
        current = ""
        for word in paragraph.split():
            candidate = word if not current else f"{current} {word}"
            if _text_width(draw, candidate, font, stroke_width) <= max_width:
                current = candidate
                continue
            if current:
                lines.append(current)
            if _text_width(draw, word, font, stroke_width) <= max_width:
                current = word
            else:
                pieces = _break_word(draw, word, font, max_width, stroke_width)
                lines.extend(pieces[:-1])
                current = pieces[-1] if pieces else ""
        if current:
            lines.append(current)
    return lines or [""]


def _break_word(draw, word, font, max_width, stroke_width):
    pieces = []
    current = ""
    for char in word:
        candidate = current + char
        if current and _text_width(draw, candidate, font, stroke_width) > max_width:
            pieces.append(current)
            current = char
        else:
            current = candidate
    if current:
        pieces.append(current)
    return pieces


def _measure_lines(draw, lines, font, stroke_width, line_spacing):
    measurements = []
    total_height = 0
    for line in lines:
        bbox = draw.textbbox((0, 0), line or " ", font=font, stroke_width=stroke_width)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        measurements.append({"bbox": bbox, "width": width, "height": height})
        total_height += height
    if len(lines) > 1:
        total_height += int(line_spacing or 0) * (len(lines) - 1)
    return measurements, total_height


def _text_width(draw, text, font, stroke_width):
    bbox = draw.textbbox((0, 0), text or " ", font=font, stroke_width=stroke_width)
    return bbox[2] - bbox[0]


def _load_font(font_name, size):
    for candidate in _font_candidates(font_name):
        try:
            if candidate.exists():
                return ImageFont.truetype(str(candidate), size=size)
        except OSError:
            continue
    for fallback in ("georgia.ttf", "arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(fallback, size=size)
        except OSError:
            continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def _font_candidates(font_name):
    raw = str(font_name or "").strip()
    if raw:
        path = Path(raw)
        if path.is_absolute():
            yield path
        yield NODE_DIR / "fonts" / raw
        yield path
        if os.name == "nt":
            yield Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / raw
    if os.name == "nt":
        fonts_dir = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
        yield fonts_dir / "georgia.ttf"
        yield fonts_dir / "arial.ttf"


def _parse_color(value, fallback):
    try:
        return ImageColor.getrgb(str(value or fallback))
    except ValueError:
        return ImageColor.getrgb(fallback)


def _parse_optional_color(value):
    text = str(value or "").strip()
    if not text or text.lower() in {"none", "transparent"}:
        return None
    try:
        return ImageColor.getrgb(text)
    except ValueError:
        return None


def _bounded_opacity(value):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 1.0
    return max(0.0, min(1.0, parsed))


def _normalize_text(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def _clip_box(image_size, box):
    image_width, image_height = image_size
    x, y, width, height = [int(round(float(value or 0))) for value in box]
    x = max(0, min(x, image_width - 1))
    y = max(0, min(y, image_height - 1))
    width = max(1, min(width, image_width - x))
    height = max(1, min(height, image_height - y))
    return x, y, width, height


def _aligned_x(x, width, line_width, alignment):
    if alignment == "left":
        return x
    if alignment == "right":
        return x + max(0, width - line_width)
    return x + max(0, width - line_width) // 2


def _aligned_y(y, height, text_height, vertical_alignment):
    if vertical_alignment == "top":
        return y
    if vertical_alignment == "bottom":
        return y + max(0, height - text_height)
    return y + max(0, height - text_height) // 2
