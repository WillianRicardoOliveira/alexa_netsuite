const express = require('express');

const app = express();
app.use(express.json());

app.post('/alexa', (req, res) => {

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
            speechText = "O faturamento de hoje é 1000 reais";
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});