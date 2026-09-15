"""Synthetic workshop fixtures, authored for this demo; no attendee data.

The split is fixed before evaluation. Examples are intentionally small and do
not establish real-world model quality. No tools are executed by this demo.
"""

TOOLS = [
    {"type": "function", "function": {
        "name": "create_task", "description": "Turn a voice note into one task.",
        "parameters": {"type": "object", "properties": {
            "action": {"type": "string", "description": "The action to do, without filler."}
        }, "required": ["action"]}}},
    {"type": "function", "function": {
        "name": "triage_notification", "description": "Classify a notification: urgent needs now; useful but not urgent needs later; spam needs ignore.",
        "parameters": {"type": "object", "properties": {
            "bucket": {"type": "string", "enum": ["now", "later", "ignore"], "description": "Priority bucket."}
        }, "required": ["bucket"]}}},
    {"type": "function", "function": {
        "name": "choose_workflow", "description": "Choose a standard workflow: meeting for agendas and notes; event for venues and RSVPs; document for drafts and proofreading.",
        "parameters": {"type": "object", "properties": {
            "workflow": {"type": "string", "enum": ["meeting", "event", "document"], "description": "Workflow to prepare."}
        }, "required": ["workflow"]}}},
]

DEVELOPER = "You are a model that can do function calling with the following functions. Call exactly one function."

# Tuples are (everyday input, expected parameter); task types and splits below
# are explicit rather than inferred from row order during evaluation.
TRAIN = {
    "action": [
        ("Voice note: remind me to buy milk", "buy milk"),
        ("Voice note: um, I need to book the room", "book the room"),
        ("Voice note: please add a task to call the printer", "call the printer"),
        ("Voice note: I should send the agenda", "send the agenda"),
        ("Voice note: remind me to charge the laptop", "charge the laptop"),
        ("Voice note: I need to check the microphone", "check the microphone"),
        ("Voice note: um, add a task to order lunch", "order lunch"),
        ("Voice note: please remind me to print the handouts", "print the handouts"),
        ("Voice note: I should test the projector", "test the projector"),
        ("Voice note: add a task to pack the charger", "pack the charger"),
        ("Voice note: I need to update the slides", "update the slides"),
        ("Voice note: remind me to reserve a table", "reserve a table"),
    ],
    "bucket": [
        ("Notification: the meeting starts in two minutes", "now"),
        ("Notification: urgent, the demo is down", "now"),
        ("Notification: someone is waiting at the locked door", "now"),
        ("Notification: the presentation begins now", "now"),
        ("Notification: next month's newsletter is available", "later"),
        ("Notification: read the notes when you have time", "later"),
        ("Notification: review this optional article this weekend", "later"),
        ("Notification: next week's agenda is ready to review", "later"),
        ("Notification: spam, you won a fake lottery", "ignore"),
        ("Notification: unsolicited bulk advertisement", "ignore"),
        ("Notification: spam promotion for miracle pills", "ignore"),
        ("Notification: a phishing message asks for your password", "ignore"),
    ],
    "workflow": [
        ("Messy instructions: get the agenda together and capture meeting notes", "meeting"),
        ("Messy instructions: invite the team to discuss the project", "meeting"),
        ("Messy instructions: schedule a check-in and write the minutes", "meeting"),
        ("Messy instructions: collect talking points for our weekly sync", "meeting"),
        ("Messy instructions: find a venue and collect RSVPs", "event"),
        ("Messy instructions: organize a meetup with seats and registration", "event"),
        ("Messy instructions: book the event space and invite attendees", "event"),
        ("Messy instructions: plan a workshop and track registrations", "event"),
        ("Messy instructions: outline the draft, edit it, then proofread", "document"),
        ("Messy instructions: turn these notes into a written guide", "document"),
        ("Messy instructions: prepare a report and check the spelling", "document"),
        ("Messy instructions: write a first draft of the handbook", "document"),
    ],
}

VALID = {
    "action": [("Voice note: I should refill the water", "refill the water"), ("Voice note: please add a task to check the batteries", "check the batteries"), ("Voice note: remind me to close the window", "close the window")],
    "bucket": [("Notification: urgent, the speaker needs help now", "now"), ("Notification: a useful blog post to read next week", "later"), ("Notification: spam advertising fake prizes", "ignore")],
    "workflow": [("Messy instructions: prepare discussion topics and meeting minutes", "meeting"), ("Messy instructions: arrange a venue for a public workshop", "event"), ("Messy instructions: draft and proofread a short article", "document")],
}

TEST = {
    "action": [("Voice note: um, remind me to bring the adapter", "bring the adapter"), ("Voice note: I need to email the checklist", "email the checklist"), ("Voice note: please add a task to clean the whiteboard", "clean the whiteboard")],
    "bucket": [("Notification: urgent, attendees cannot enter the building", "now"), ("Notification: useful reading saved for the end of the week", "later"), ("Notification: spam claiming you won an imaginary vacation", "ignore")],
    "workflow": [("Messy instructions: organize our team discussion and record the decisions", "meeting"), ("Messy instructions: arrange a community gathering, venue, and signups", "event"), ("Messy instructions: compose the draft and polish the wording", "document")],
}

FUNCTIONS = {"action": "create_task", "bucket": "triage_notification", "workflow": "choose_workflow"}


def rows(split):
    result = []
    for parameter, examples in split.items():
        for text, value in examples:
            result.append({
                "messages": [
                    {"role": "developer", "content": DEVELOPER},
                    {"role": "user", "content": text},
                    {"role": "assistant", "tool_calls": [{"type": "function", "function": {
                        "name": FUNCTIONS[parameter], "arguments": {parameter: value}
                    }}]},
                ],
                "tools": TOOLS,
            })
    return result
