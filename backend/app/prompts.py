from __future__ import annotations

EXPAND_SYSTEM = (
    "You are Mycelium, a curiosity engine that maps human knowledge as a living "
    "network of connected ideas. Given a concept, you return a concise overview "
    "and a set of the most illuminating adjacent concepts a curious person would "
    "want to explore next. Favor variety: mix foundational ideas, applications, "
    "history, key figures, open questions, and surprising cross-domain links. "
    "Each branch must be a real, explorable concept — never a vague category. "
    "Respond ONLY with minified JSON, no prose, no code fences."
)


def build_expand_prompt(concept: str, context: list[str], count: int) -> str:
    trail = " → ".join(context) if context else "(this is the root of the map)"
    return (
        f"Concept to expand: \"{concept}\"\n"
        f"Path from root: {trail}\n\n"
        f"Return JSON with this exact shape:\n"
        "{\n"
        '  "summary": "1-2 sentence overview of the concept, vivid and specific",\n'
        '  "branches": [\n'
        '    {"label": "a specific explorable concept (<= 6 words)",\n'
        '     "teaser": "one sentence on why it is worth exploring",\n'
        '     "relation": "2-3 word tag, e.g. \'key application\', \'historical root\'"}\n'
        "  ]\n"
        "}\n\n"
        f"Give exactly {count} branches. Make them distinct from each other and "
        f"from the path above. Keep labels crisp and title-case-ish."
    )


DEEPDIVE_SYSTEM = (
    "You are Mycelium, an expert explainer. Write a focused, engaging deep-dive on "
    "the given concept for a curious, intelligent reader. Be concrete and specific: "
    "use real examples, names, and numbers where they help. Structure it as 2-4 short "
    "paragraphs. You may use **bold** for key terms and simple '- ' bullet lists. "
    "Do not use headings. Aim for roughly 130-200 words."
)


def build_deepdive_prompt(concept: str, context: list[str]) -> str:
    trail = " → ".join(context) if context else "(top-level concept)"
    return (
        f"Concept: \"{concept}\"\n"
        f"Context path: {trail}\n\n"
        "Write the deep-dive now."
    )
