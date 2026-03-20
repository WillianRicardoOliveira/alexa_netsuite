const express = require('express');
const axios = require('axios');
const oauth = require('axios-oauth-1.0a');

const app = express();
app.use(express.json());

// ==========================
// 🔹 CONFIG NETSUITE
// ==========================
const NETSUITE_URL = 'https://6932886.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2582&deploy=1';

// ==========================
// 🔹 SERVICE NETSUITE
// ==========================
async function buscarDadosNetSuite() {

    const client = oauth({
        url: NETSUITE_URL,
        method: 'POST',
        data: {
            consulta: "api_custo_desembarcado",
            filtros: {
                memorando: "ALT 2025-159 BP 2%",
                id: 0
            },
            limit: 500
        },
        oauth: {
            consumer_key: '1c17e6883aaee9076cba8a14f018ec876538f4c9043a42d27077691a0b7b7b11',
            consumer_secret: '632b6b0f744eecd29be7510ec509990e72ba482ef4aabeada2bcad5924266447',
            token: '71323f421135af0d67f83719c5a1f090b22f3803f9ef43522aa1ee999dc2e259',
            token_secret: '8e9cc63d5334c635af23642aa95c353f98c0ae14084098df92bfdc0c40e9ae40',
            realm: '6932886',
            signature_method: 'HMAC-SHA256'
        }
    });

    try {
        const response = await client();

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
                console.log(dados);
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