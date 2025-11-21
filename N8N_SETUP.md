# Configurare n8n pentru Chat Integration

Acest document explică cum să configurezi n8n pentru integrarea cu chat-ul aplicației.

## Pasul 1: Instalare n8n

### Opțiunea 1: n8n local (recomandat pentru development)

```bash
npm install n8n -g
n8n start
```

### Opțiunea 2: Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  n8nio/n8n
```

### Opțiunea 3: n8n Cloud

Folosește serviciul cloud de la https://n8n.io

## Pasul 2: Creare Workflow în n8n

1. Deschide n8n (http://localhost:5678 pentru local)
2. Creează un workflow nou
3. Adaugă un nod **Webhook** ca prim nod:

   - **HTTP Method**: POST
   - **Path**: `/webhook/chat`
   - **Response Mode**: "Respond to Webhook"
   - **Response Code**: 200

4. Adaugă un nod **Code** sau **Function** pentru procesarea datelor și construirea promptului:

   ```javascript
   // Extrage datele din webhook
   const conversationHistory = $input.item.json.conversation_history || [];
   const jsonSchema = $input.item.json.response_json_schema || null;

   // Găsește ultimul mesaj de user (pentru Basic LLM Chain)
   const lastUserMessage = conversationHistory
     .filter((m) => m.role === "user")
     .slice(-1)[0]?.content || "";

   // Construiește contextul conversației din istoric
   const conversationContext = conversationHistory
     .map((m) => `${m.role === "user" ? "Utilizator" : "Bot"}: ${m.content}`)
     .join("\n\n");

   // Construiește promptul complet cu contextul conversației
   const systemPrompt = `Ești un asistent inteligent care ajută utilizatorii să trimită feedback despre aplicații/servicii.
   ```

STIL ȘI TON:

- Răspunde întotdeauna într-un mod prietenos, natural și conversațional
- Folosește un ton cald și empatic
- Pentru primul mesaj sau mesaje simple, răspunde cu mesaje de bun venit și oferă ajutor
- Exemple de răspunsuri bune: ( poți să le personalizezi în funcție de context )
  - "Bună! Cu ce te pot ajuta astăzi?"
  - "Am înțeles. Poți să-mi povestești mai multe detalii despre asta?"
  - "Bine! Hai să discutăm despre [subiect]. Poți să-mi dai mai multe detalii?"
  - "Înțeleg. Te rog să-mi spui mai multe despre problema ta."
- Evită răspunsuri prea formale sau tehnice
- Fii natural, ca și cum ai conversa cu un prieten

Conversație până acum:
${conversationContext}

Sarcina ta:

1. Analizează conversația și construiește un obiect `ticket` cu cât mai multe dintre următoarele câmpuri:

   - id (număr intern, poate rămâne null)
   - ticket_id (string unic - poți genera `FB-${Date.now()}` dacă lipsește)
   - category / subcategory / description / severity
   - location_county / location_city / institution
   - status (implicit "new" dacă nu e menționat)
   - summary
   - tags (array de string-uri)
   - user_role, user_recommendations
   - datetime (timestamp ISO 8601 – folosește timpul curent dacă nu e furnizat)

2. Dacă nu ai suficiente informații, pune următoarea întrebare contextuală și naturală.

   - Pune întrebări simple, naturale, pe rând
   - Nu pune mai mult de o întrebare odată
   - Dacă ai toate informațiile necesare (descriere clară + categorie), răspunde cu "READY_FOR_CONFIRMATION"

3. Întrebările trebuie să fie:
   - Naturale și conversaționale
   - Empatice și prietenoase
   - Specifice contextului problemei
   - Maxim 4-5 întrebări în total

Răspunde în format JSON:
{
"next_message": "mesajul tău (sau 'READY_FOR_CONFIRMATION' dacă ai toate info)",
"ticket": {
"id": number | null,
"ticket_id": "string",
"category": "...",
"subcategory": "...",
"description": "...",
"severity": "...",
"location_county": "...",
"location_city": "...",
"institution": "...",
"status": "new",
"summary": "...",
"tags": ["..."],
"user_role": "...",
"user_recommendations": "...",
"datetime": "ISO8601 string"
},
"confidence": "high/medium/low"
}`;

// Construiește mesajele pentru LLM
const messages = [
{
role: "system",
content: systemPrompt
},
...conversationHistory.map(msg => ({
role: msg.role === "user" ? "user" : "assistant",
content: msg.content
}))
];

// Returnează datele pentru următorul nod
return {
json: {
messages,
systemPrompt,
jsonSchema,
conversationHistory,
lastUserMessage, // Ultimul mesaj de user (pentru Basic LLM Chain)
},
};

````

5. Adaugă un nod **OpenAI** sau **Anthropic** sau alt LLM provider:

   - **Model**: gpt-4, claude-3, etc.
   - **Messages**: Folosește `messages` din output-ul nodului Code anterior
   - **Response Format**: JSON Schema (folosește `jsonSchema` din output sau schema din `n8n-response-schema.json`)

**IMPORTANT - Pentru Basic LLM Chain:**
Dacă folosești nodul "Basic LLM Chain" în loc de "OpenAI Chat Model":
- **Prompt (User Message)**: Folosește expresia pentru ultimul mesaj de user:
  ```
  {{ $json.lastUserMessage }}
  ```
  Sau direct din conversation_history (dacă ultimul mesaj este întotdeauna de la user):
  ```
  {{ $json.conversation_history[$json.conversation_history.length - 1].content }}
  ```
  Sau pentru a găsi ultimul mesaj de user (chiar dacă ultimul mesaj din array este bot):
  ```
  {{ $json.conversation_history.filter(m => m.role === 'user').slice(-1)[0].content }}
  ```
- **Chat Messages - System Message**: Adaugă promptul din `n8n-system-prompt.txt` (fără placeholder-ul `{conversation_context}`)
- **Chat Messages - User Message**: Folosește `{{ $json.lastUserMessage }}` sau expresia de mai sus

**NOTĂ**: Mesajele sunt deja construite în nodul Code anterior, inclusiv system prompt-ul cu contextul conversației. Doar conectează output-ul nodului Code la input-ul nodului LLM.

6. Adaugă un nod **Code** pentru formatarea răspunsului (FORMAT EXACT):

```javascript
const llmResponse = $input.item.json;

// Parsează răspunsul LLM și asigură formatul exact
let parsedResponse;
try {
// Dacă LLM returnează JSON string în content
if (typeof llmResponse.content === "string") {
 parsedResponse = JSON.parse(llmResponse.content);
}
// Dacă LLM returnează direct obiectul
else if (llmResponse.content && typeof llmResponse.content === "object") {
 parsedResponse = llmResponse.content;
}
// Dacă răspunsul este direct în root
else if (llmResponse.next_message !== undefined) {
 parsedResponse = llmResponse;
}
// Fallback
else {
 parsedResponse = llmResponse;
}
} catch (e) {
// În caz de eroare, returnează formatul minim
parsedResponse = {
 next_message: llmResponse.content || "Scuze, am întâmpinat o problemă.",
 ticket: {},
 confidence: "low",
};
}

// Asigură că toate câmpurile necesare există
const formattedResponse = {
next_message: parsedResponse.next_message || "",
ticket: parsedResponse.ticket || parsedResponse.extracted_data || {},
confidence: parsedResponse.confidence || "medium",
};

// Returnează în formatul exact așteptat de frontend
return {
json: {
 data: formattedResponse,
},
};
````

**NOTĂ CRITICĂ**: Formatul răspunsului trebuie să fie EXACT ca mai sus. Frontend-ul așteaptă:

- `data.next_message` (string)
- `data.ticket` (obiect cu datele conversației/ticketului)
- `data.confidence` (string: "high", "medium", sau "low")

7. Conectează nodurile: Webhook → Code → LLM → Code → Webhook Response

## Pasul 3: Configurare Variabilă de Mediu

1. Creează un fișier `.env` în root-ul proiectului:

   ```bash
   cp .env.example .env
   ```

2. Editează `.env` și setează URL-ul webhook-ului n8n:

   ```
   VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/chat
   ```

   Pentru producție:

   ```
   VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chat
   ```

## Pasul 4: Testare

1. Pornește n8n: `n8n start`
2. Activează workflow-ul în n8n
3. Pornește aplicația: `npm run dev`
4. Testează chat-ul în aplicație

## Formatul Datelor

### Request către n8n:

```json
{
  "prompt": "System prompt...",
  "response_json_schema": {
    "type": "object",
    "properties": {
      "next_message": {
        "type": "string",
        "description": "Mesajul bot-ului către utilizator sau 'READY_FOR_CONFIRMATION' când are toate informațiile necesare"
      },
      "ticket": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "ticket_id": { "type": "string" },
          "category": { "type": "string" },
          "subcategory": { "type": "string" },
          "description": { "type": "string" },
          "severity": {
            "type": "string",
            "enum": ["scăzută", "medie", "ridicată", "critică"]
          },
          "location_county": { "type": "string" },
          "location_city": { "type": "string" },
          "institution": { "type": "string" },
          "status": { "type": "string" },
          "summary": { "type": "string" },
          "tags": {
            "type": "array",
            "items": { "type": "string" }
          },
          "user_role": { "type": "string" },
          "user_recommendations": { "type": "string" },
          "datetime": { "type": "string" }
        },
        "required": []
      },
      "confidence": {
        "type": "string",
        "description": "Nivelul de încredere al extragerii datelor",
        "enum": ["high", "medium", "low"]
      }
    },
    "required": ["next_message", "ticket", "confidence"]
  },
  "conversation_history": [
    {
      "role": "user",
      "content": "Mesaj utilizator",
      "timestamp": "2024-01-01T00:00:00.000Z"
    },
    {
      "role": "bot",
      "content": "Răspuns bot",
      "timestamp": "2024-01-01T00:00:01.000Z"
    }
  ]
}
```

**Schema completă pentru structured output** (salvată în `n8n-response-schema.json`):

```json
{
  "type": "object",
  "properties": {
    "next_message": {
      "type": "string",
      "description": "Mesajul bot-ului către utilizator sau 'READY_FOR_CONFIRMATION' când are toate informațiile necesare"
    },
    "ticket": {
      "type": "object",
      "properties": {
        "id": { "type": "number" },
        "ticket_id": { "type": "string" },
        "category": { "type": "string" },
        "subcategory": { "type": "string" },
        "description": { "type": "string" },
        "severity": {
          "type": "string",
          "enum": ["scăzută", "medie", "ridicată", "critică"]
        },
        "location_county": { "type": "string" },
        "location_city": { "type": "string" },
        "institution": { "type": "string" },
        "status": { "type": "string" },
        "summary": { "type": "string" },
        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },
        "user_role": { "type": "string" },
        "user_recommendations": { "type": "string" },
        "datetime": { "type": "string" }
      },
      "required": []
    },
    "confidence": {
      "type": "string",
      "description": "Nivelul de încredere al extragerii datelor",
      "enum": ["high", "medium", "low"]
    }
  },
  "required": ["next_message", "ticket", "confidence"]
}
```

### Response de la n8n (FORMAT EXACT REQUIS):

**IMPORTANT**: n8n trebuie să returneze răspunsul în exact acest format pentru ca frontend-ul să funcționeze corect.

```json
{
  "data": {
    "next_message": "Mesajul bot-ului sau 'READY_FOR_CONFIRMATION'",
    "ticket": {
      "ticket_id": "FB-XYZ123",
      "category": "Problemă Tehnică",
      "subcategory": "...",
      "description": "...",
      "severity": "medie",
      "status": "new",
      "tags": ["chatbot"],
      "datetime": "2025-01-18T10:00:00Z"
    },
    "confidence": "high"
  }
}
```

**Sau format direct (fără wrapper `data`):**

```json
{
  "next_message": "Mesajul bot-ului sau 'READY_FOR_CONFIRMATION'",
  "ticket": {
    "ticket_id": "FB-XYZ123",
    "category": "Problemă Tehnică",
    "subcategory": "...",
    "description": "...",
    "severity": "medie",
    "status": "new",
    "tags": ["chatbot"],
    "datetime": "2025-01-18T10:00:00Z"
  },
  "confidence": "high"
}
```

**Structura exactă:**

- `next_message` (string, required): Mesajul bot-ului sau `"READY_FOR_CONFIRMATION"` când are toate informațiile
- `ticket` (object, required): Obiect cu datele conversației/ticketului
  - `ticket_id`, `category`, `subcategory`, `description`, `severity`, `location_*`, `institution`, `status`, `summary`, `tags`, `user_role`, `user_recommendations`, `datetime`
- `confidence` (string, required): Nivelul de încredere (high/medium/low)

## Troubleshooting

### Eroare: "Failed to fetch"

- Verifică că n8n rulează și workflow-ul este activat
- Verifică URL-ul în `.env` este corect
- Verifică CORS în n8n (dacă e necesar)

### Eroare: "n8n webhook error: 404"

- Verifică că path-ul webhook-ului este corect (`/webhook/chat`)
- Verifică că workflow-ul este activat în n8n

### Răspunsul nu este în formatul așteptat

- Verifică că nodul LLM returnează JSON valid
- Verifică că nodul de formatare parsează corect răspunsul

## Exemple de Workflow-uri n8n

### Workflow simplu cu OpenAI:

1. Webhook (POST /webhook/chat)
2. OpenAI Chat Model
   - Model: gpt-4
   - Messages: Construit din conversation_history
   - Response Format: JSON Schema
3. Return Response

### Workflow cu procesare suplimentară:

1. Webhook (POST /webhook/chat)
2. Code (procesare input)
3. OpenAI Chat Model
4. Code (formatare output)
5. Return Response

## Notițe

- Pentru producție, folosește autentificare pentru webhook-ul n8n
- Consideră rate limiting pentru a preveni abuzul
- Loghează request-urile pentru debugging
- Folosește variabile de mediu pentru API keys (nu le hardcodezi în workflow)
