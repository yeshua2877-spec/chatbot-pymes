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

SYSTEM_PROMPT = """Sos un asistente virtual de atención al cliente para pequeñas y medianas empresas argentinas.
Tu rol es ayudar a los clientes de manera amable, clara y profesional.

Lineamientos:
- Respondé siempre en español rioplatense (usá "vos", "te", "tu").
- Sé conciso pero completo. No des respuestas innecesariamente largas.
- Si no sabés algo con certeza, decilo claramente y ofrecé derivar al equipo humano.
- Ante consultas sobre precios, stock o información específica del negocio que no tenés,
  indicá que consultarás con el equipo y pedí un dato de contacto del cliente.
- Mantené un tono cordial y profesional en todo momento.
- Si el cliente expresa insatisfacción, reconocé el problema y ofrecé soluciones concretas.
- Para consultas fuera de tu alcance, derivá al equipo de soporte humano.
"""

MODEL = "claude-haiku-4-5"
MAX_TOKENS = 1024


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/widget.js")
def widget():
    return send_from_directory(".", "widget.js")


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
