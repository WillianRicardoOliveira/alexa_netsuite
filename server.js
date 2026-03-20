const express = require('express');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// ==========================
// 🔹 CONFIG NETSUITE
// ==========================
const NETSUITE_URL = 'https://6932886.app.netsuite.com/app/site/hosting/restlet.nl?script=2582&deploy=1';

const oauth = OAuth({
    consumer: {
        key: '1c17e6883aaee9076cba8a14f018ec876538f4c9043a42d27077691a0b7b7b11',
        secret: '632b6b0f744eecd29be7510ec509990e72ba482ef4aabeada2bcad5924266447',
    },
    signature_method: 'HMAC-SHA256',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha256', key)
            .update(base_string)
            .digest('base64');
    },
});

const token = {
    key: '71323f421135af0d67f83719c5a1f090b22f3803f9ef43522aa1ee999dc2e259',
    secret: '8e9cc63d5334c635af23642aa95c353f98c0ae14084098df92bfdc0c40e9ae40',
};

function getHeaders(url) {
    const request_data = {
        url,
        method: 'POST',
    };

    const oauthData = oauth.authorize(request_data, token);

    return {
        Authorization: oauth.toHeader(oauthData).Authorization
            .replace('OAuth ', `OAuth realm="6932886", `),
        'Content-Type': 'application/json'
    };
}

// ==========================
// 🔹 SERVICE NETSUITE
// ==========================
async function buscarDadosNetSuite() {

    const request_data = {
        url: NETSUITE_URL,
        method: 'POST',
    };

    const headers = getHeaders(NETSUITE_URL);

    try {
        const response = await axios.post(
            NETSUITE_URL,
            {
                consulta: "api_custo_desembarcado",
                filtros: {
                    memorando: "ALT 2025-159 BP 2%",
                    id: 0
                },
                limit: 500
            },
            {
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Resposta NetSuite:', JSON.stringify(response.data, null, 2));

        return response.data;

    } catch (error) {
        console.error('Erro NetSuite:', error.response?.data || error.message);
        return null;
    }
}

// ==========================
// 🔹 ENDPOINT ALEXA
// ==========================
app.post('/alexa', async (req, res) => {

    console.log('Requisição recebida da Alexa');
    console.log(JSON.stringify(req.body, null, 2));

    const requestType = req.body.request.type;

    let speechText = "Não entendi sua solicitação";

    if (requestType === 'LaunchRequest') {
        speechText = "Bem vindo ao Ruraldinho. Como posso ajudar?";
    }

    if (requestType === 'IntentRequest') {
        const intentName = req.body.request.intent.name;

        if (intentName === 'FaturamentoHojeIntent') {

            const dados = await buscarDadosNetSuite();

            if (dados && dados.data && dados.data.length > 0) {
                const fatura = dados.data[0].fatura;
                speechText = `Encontrei a fatura ${fatura}`;
            } else {
                speechText = "Não encontrei dados no NetSuite";
            }
        }
    }

    return res.json({
        version: "1.0",
        response: {
            outputSpeech: {
                type: "PlainText",
                text: speechText
            },
            shouldEndSession: false
        }
    });
});

// ==========================
// 🔹 START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});