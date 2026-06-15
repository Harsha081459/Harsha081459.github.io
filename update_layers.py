import re

with open('D:/Cursor_folder/ai-portfolio/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

def replacer(match):
    num = int(match.group(1))
    if num >= 1:
        return 'data-layer="' + str(num + 1) + '"'
    return match.group(0)

text = re.sub(r'data-layer="(\d+)"', replacer, text)
text = text.replace('class="impact-flashcards"', 'class="impact-flashcards network-box" data-layer="1"')

with open('D:/Cursor_folder/ai-portfolio/index.html', 'w', encoding='utf-8') as f:
    f.write(text)
