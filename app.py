import os
from flask import Flask, request, jsonify, send_from_directory
import anthropic
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv(override=True)

app = Flask(__name__)
CORS(app)
client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# In-memory session store: {session_id: [messages]}
sessions: dict[str, list[dict]] = {}

SYSTEM_PROMPT = """Sos el asistente virtual de YO SOY shoes, una tienda de zapatos de mujer.
Tu rol es atender a las clientas de manera cálida, cercana y profesional.

Información del negocio:
- Vendemos zapatos de mujer exclusivamente.
- Apuntamos a zapatos para distintas ocasiones: la oficina, una cena o noche especial, un almuerzo, una salida con amigas.
- No realizamos envíos por el momento, la compra es presencial o con retiro acordado.
- Formas de pago: efectivo, transferencia bancaria y MercadoPago.
- Para consultas de precios, modelos disponibles o stock, derivá siempre a nuestros canales:
  * WhatsApp: +5493584023958
  * Instagram: @yosoy_claudiagiovanini

Lineamientos:
- Respondé siempre en español rioplatense (usá "vos", "te", "tu").
- Usá un tono amigable y femenino, acorde a una tienda de moda.
- Sé concisa. No des respuestas largas innecesarias.
- Si te preguntan por precio o disponibilidad de algún modelo, decí que con gusto lo pueden consultar por WhatsApp (+5493584023958) o Instagram (@yosoy_claudiagiovanini).
- Si el cliente quiere hacer una compra, indicale que se comunique por WhatsApp para coordinar.
- Si hay alguna queja o problema, reconocé la situación con empatía y derivá al equipo.
- No inventes precios ni información que no tenés.
"""

MODEL = "claude-haiku-4-5"
MAX_TOKENS = 1024


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/widget.js")
def widget():
    return send_from_directory(".", "widget.js")


@app.route("/music.mp3")
def music():
    return send_from_directory(".", "music.mp3")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Se requiere un body JSON"}), 400

    message = data.get("message", "").strip()
    session_id = data.get("session_id", "").strip()

    if not message:
        return jsonify({"error": "El campo 'message' es requerido"}), 400
    if not session_id:
        return jsonify({"error": "El campo 'session_id' es requerido"}), 400

    history = sessions.setdefault(session_id, [])
    history.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=history,
        )
        assistant_text = response.content[0].text
    except anthropic.APIError as e:
        history.pop()  # revert the user message on error
        return jsonify({"error": f"Error de API: {str(e)}"}), 500

    history.append({"role": "assistant", "content": assistant_text})

    return jsonify({
        "response": assistant_text,
        "session_id": session_id,
        "usage": {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
        },
    })


@app.route("/chat/<session_id>", methods=["DELETE"])
def clear_session(session_id):
    sessions.pop(session_id, None)
    return jsonify({"message": f"Sesión '{session_id}' eliminada"}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true", port=port)
