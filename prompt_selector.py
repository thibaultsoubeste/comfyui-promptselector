import hashlib


class PromptSelector:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "prompts_json": ("STRING", {"multiline": True, "default": "{}"}),
                "prompt": ("STRING", {"multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "pass_through"
    CATEGORY = "Prompt Utils"

    def pass_through(self, prompts_json, prompt):
        return (prompt,)

    @classmethod
    def IS_CHANGED(cls, prompts_json, prompt):
        """Triggers re-execution only when the resolved text changes."""
        try:
            return hashlib.md5(prompt.encode("utf-8")).hexdigest()
        except Exception:
            return hashlib.md5(b"").hexdigest()


NODE_CLASS_MAPPINGS = {
    "PromptSelector": PromptSelector,
}
