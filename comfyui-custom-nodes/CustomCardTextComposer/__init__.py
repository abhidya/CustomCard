from .nodes import CustomCardTextComposer

NODE_CLASS_MAPPINGS = {
    "CustomCardTextComposer": CustomCardTextComposer,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CustomCardTextComposer": "CustomCard Text Composer",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
