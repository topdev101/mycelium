from __future__ import annotations

import random

from .models import Branch

_FACETS: list[tuple[str, str, str]] = [
    ("foundations", "Foundations of {c}", "The core ideas everything else in {c} is built on."),
    ("key application", "{c} in Practice", "Where {c} leaves theory and does real work in the world."),
    ("historical root", "Origins of {c}", "How {c} came to be, and the moment it clicked."),
    ("key figures", "Pioneers of {c}", "The people whose work defined {c} as we know it."),
    ("open question", "Frontiers of {c}", "The unsolved problems keeping researchers up at night."),
    ("adjacent field", "Beyond {c}", "A neighboring domain that quietly borrows from {c}."),
    ("core principle", "The Logic of {c}", "The single principle that makes {c} tick."),
    ("modern shift", "The Future of {c}", "Where {c} is heading over the next decade."),
    ("misconception", "Myths about {c}", "What almost everyone gets wrong about {c}."),
    ("surprising link", "{c}, Unexpectedly", "A connection to {c} you would never guess."),
    ("building block", "Anatomy of {c}", "Take {c} apart and see what the pieces do."),
    ("trade-off", "The Cost of {c}", "Nothing is free — the tensions baked into {c}."),
]

_SUMMARIES = [
    "{c} sits at the crossroads of several disciplines, which is exactly what makes it worth mapping.",
    "{c} looks simple from a distance and reveals surprising depth the closer you look.",
    "Understanding {c} means following a few threads at once — history, mechanics, and consequence.",
    "{c} is one of those ideas that quietly shapes far more than its name suggests.",
]

_DEEPDIVE_OPENERS = [
    "**{c}** rewards a second look. What seems like a single idea is really a small "
    "ecosystem of choices, constraints, and happy accidents.",
    "To really get **{c}**, it helps to ask not just *what* it is but *why it took "
    "the shape it did* — the constraints it was answering.",
    "**{c}** is best understood as a set of trade-offs. Every strength it has was paid "
    "for somewhere else, and that is where the interesting questions live.",
]

_DEEPDIVE_MIDDLES = [
    "In practice, the details that matter most are rarely the headline ones. The "
    "edge-cases, the failure modes, and the assumptions baked in early tend to decide "
    "how things actually play out.",
    "A few forces usually dominate:\n- what it optimizes for\n- what it quietly "
    "ignores\n- who benefits when it works\nHold those three in mind and most of the "
    "behavior falls into place.",
    "The classic examples are worth internalizing because they compress a lot of "
    "hard-won intuition into a form you can carry into new situations.",
]


def _rng(concept: str, salt: str = "") -> random.Random:
    return random.Random(f"{concept.strip().lower()}|{salt}")


_STRIP_PREFIXES = (
    "Foundations of ",
    "Origins of ",
    "The Future of ",
    "The Cost of ",
    "Myths about ",
    "Beyond ",
    "The Logic of ",
    "Anatomy of ",
    "Pioneers of ",
    "Frontiers of ",
)
_STRIP_SUFFIXES = (" in Practice", ", Unexpectedly")


def _base_term(concept: str) -> str:
    c = concept.strip()
    changed = True
    while changed:
        changed = False
        for p in _STRIP_PREFIXES:
            if c.startswith(p):
                c = c[len(p):]
                changed = True
        for s in _STRIP_SUFFIXES:
            if c.endswith(s):
                c = c[: -len(s)]
                changed = True
    return c.strip() or concept.strip()


def mock_expansion(concept: str, count: int) -> tuple[str, list[Branch]]:
    base = _base_term(concept)
    rng = _rng(concept.strip(), "expand")
    facets = _FACETS[:]
    rng.shuffle(facets)
    chosen = facets[: max(2, min(count, len(facets)))]
    branches = [
        Branch(
            label=lbl.format(c=base),
            teaser=tsr.format(c=base),
            relation=rel,
        )
        for rel, lbl, tsr in chosen
    ]
    summary = rng.choice(_SUMMARIES).format(c=concept.strip())
    return summary, branches


def mock_deepdive(concept: str, context: list[str]) -> str:
    c = concept.strip()
    rng = _rng(c, "deepdive")
    opener = rng.choice(_DEEPDIVE_OPENERS).format(c=c)
    middle = rng.choice(_DEEPDIVE_MIDDLES).format(c=c)
    trail = ""
    if context:
        trail = (
            f" Seen from the path *{' → '.join(context[-3:])}*, {c} reads as a natural "
            "next step rather than a detour."
        )
    closer = (
        "\n\n*(Demo content — add an OpenAI API key to the backend to replace this "
        "with a real, grounded explanation.)*"
    )
    return f"{opener}\n\n{middle}{trail}{closer}"
