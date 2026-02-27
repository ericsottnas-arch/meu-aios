from rembg import remove
from PIL import Image
import io

for name in ['antes', 'depois']:
    print(f"Processando {name}...")
    inp = Image.open(f'{name}.jpg')

    # Remove background
    output = remove(inp)

    # Save as PNG (with transparency)
    output.save(f'{name}_nobg.png')

    # Also create version with dark background
    dark_bg = Image.new('RGBA', output.size, (26, 26, 28, 255))
    dark_bg.paste(output, (0, 0), output)
    dark_bg.convert('RGB').save(f'{name}_dark.jpg', quality=95)

    print(f"  ✅ {name}_nobg.png (transparente)")
    print(f"  ✅ {name}_dark.jpg (fundo escuro)")

print("\n✅ Background removido com sucesso!")
