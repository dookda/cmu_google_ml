const express = require('express');
const app = express.Router();
const https = require('https');
const fs = require('fs');
const axios = require('axios');

async function detectLabel() {
    // Imports the Google Cloud client library
    const vision = require('@google-cloud/vision');

    // Creates a client
    const client = new vision.ImageAnnotatorClient();

    // Performs label detection on the image file
    const [result] = await client.labelDetection('./resources/wakeupcat.jpg');
    const labels = result.labelAnnotations;

    const textArr = []
    labels.forEach(label => textArr.push(label.description));
    return textArr
}
// detectLabel()

async function detectLanguage() {
    const vision = require('@google-cloud/vision');
    const language = require('@google-cloud/language');
    const client = new vision.ImageAnnotatorClient();
    const lclient = new language.LanguageServiceClient();

    const fileName = './resources/329752910_2310907935755947_2807452803581570946_n.jpg';
    // Detects text in the image
    const [result] = await client.textDetection(fileName);
    const detections = result.textAnnotations;
    console.log(`Text: ${detections[0].description}`);

    // Classifies the text to determine its language
    const [classification] = await lclient.classifyText({
        document: {
            content: detections[0].description,
            type: 'PLAIN_TEXT'
        }
    });

    // Extracts the language code from the classification result
    const languageCode = classification.languages[0].languageCode;
    console.log(`Language: ${languageCode}`);

}
// detectLanguage()

async function getStreetView() {
    const API_KEY = 'AIzaSyA72CE12t6VF1MHjQLbz8Y7tH2eVrR5EzQ';
    // const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';
    const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview';

    // const lat = 37.869260;
    // const lng = -122.254811;
    // const size = '900x700';
    // const location = `${lat},${lng}`;

    const lat = 16.7447112;
    const lng = 100.1992181;
    const heading = 0;
    const fov = 180;
    const pitch = 0;
    const size = '2048x2048';

    const imgUrl = `${BASE_URL}?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${API_KEY}`;
    const metaUrl = `${BASE_URL}/metadata?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${API_KEY}`;


    axios.get(metaUrl).then((res) => {
        const data = res.data;
        const fileName = './resources/' + res.data.pano_id + '.jpg';

        if (data.status === 'OK') {
            axios({
                method: 'get',
                url: imgUrl,
                responseType: 'arraybuffer'
            }).then((response) => {
                fs.writeFile(fileName, response.data, 'binary', (error) => {
                    if (error) {
                        console.error(error);
                        return;
                    }
                    console.log('Image saved successfully!');
                    detectText(fileName).then((data) => {
                        console.log(data)
                    })
                });
            })
                .catch((error) => {
                    console.error(error);
                });
        } else {
            console.error('No street view image found for the specified location.');
        }
    })
        .catch((error) => {
            console.error(error);
        });


    // axios.get(imgUrl).then((response) => {
    //     const fileName = './resources/' + response.data.pano_id + '.jpg';
    //     console.log(fileName);
    //     https.get(url, (response) => {
    //         response.pipe(fs.createWriteStream(fileName))

    //         detectText(fileName).then((data) => {
    //             console.log(data)
    //         })
    //     })
    // });
}

// detect Text
async function detectText(fileName) {
    const vision = require('@google-cloud/vision');
    const LanguageDetect = require('languagedetect');
    const lngDetector = new LanguageDetect();

    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection(fileName);
    const detections = result.textAnnotations;
    let query = 'Google';
    let langArr = [];
    let textArr = detections.filter(item => item.description.indexOf(query) < 0).map(item => {
        // langArr.push(detector.detect(item.description))
        const text = "This is a sample text.";
        const lang = lngDetector.detect(item.description, 1);
        console.log(item.description, lang);
    });
    // console.log(textArr, langArr);
}

const getImage = (pano_id) => {
    const streetview = require('streetview-panorama')
    streetview.saveImg({ id: pano_id, type: "google", fileName: './panorama/' })
    setTimeout(() => {
        detectText('./panorama/' + pano_id + '.png')
    }, 1000)
}

const downloadStreetview = (url, fileName) => {
    const API_KEY = 'AIzaSyA72CE12t6VF1MHjQLbz8Y7tH2eVrR5EzQ';
    const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';
    const lat = 16.7447112;
    const lng = 100.1992181;
    const heading = 0;
    const fov = 180;
    const pitch = 0;
    const size = '2048x2048';

    const imgUrl = `${BASE_URL}?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${API_KEY}`;

    axios.get(imgUrl).then((res) => {
        const pano_id = res.data.pano_id;
        getImage(pano_id)
    })
}

downloadStreetview()

app.get('/label', (req, res) => {
    const dat = detectLabel()
    res.json({ data: 'Label detection done' })
})

app.get('/text', (req, res) => {
    detectText().then((data) => {
        console.log(data);
        res.json({ data: data })
    })
})

module.exports = app;