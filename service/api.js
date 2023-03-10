const express = require('express');
const app = express.Router();
const axios = require('axios');

const db = require("./db").db;

const streetview = require('streetview-panorama')
const vision = require('@google-cloud/vision');
const language = require('@google-cloud/language');
const LanguageDetect = require('languagedetect');

const API_KEY = '';

const fs = require('fs');


async function multipleObject(fileName) {
    const client = new vision.ImageAnnotatorClient();
    const request = {
        image: { content: fs.readFileSync(fileName) },
    };

    const [result] = await client.objectLocalization(request);
    const objects = result.localizedObjectAnnotations;
    objects.forEach(object => {
        console.log(`Name: ${object.name}`);
        console.log(`Confidence: ${object.score}`);
        const vertices = object.boundingPoly.normalizedVertices;
        vertices.forEach(v => console.log(`x: ${v.x}, y:${v.y}`));
    });
}
async function logoDetection(fileName) {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.logoDetection(fileName);
    const logos = result.logoAnnotations;
    console.log('Logos:');
    logos.forEach(logo => console.log(logo));
}

async function imageProperties(fileName) {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.imageProperties(fileName);
    const colors = result.imagePropertiesAnnotation.dominantColors.colors;
    colors.forEach(color => console.log(color));
}

async function faceDetection(fileName) {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.faceDetection(fileName);
    const faces = result.faceAnnotations;
    console.log('Faces:');
    faces.forEach((face, i) => {
        console.log(`  Face #${i + 1}:`);
        console.log(`    Joy: ${face.joyLikelihood}`);
        console.log(`    Anger: ${face.angerLikelihood}`);
        console.log(`    Sorrow: ${face.sorrowLikelihood}`);
        console.log(`    Surprise: ${face.surpriseLikelihood}`);
    });
}

async function landmarkDetection(fileName) {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.landmarkDetection(fileName);
    const landmarks = result.landmarkAnnotations;
    console.log('Landmarks:');
    landmarks.forEach(landmark => console.log(landmark));
}

async function detectLabel() {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.labelDetection('./resources/maxresdefault.jpg');
    const labels = result.labelAnnotations;

    const textArr = []
    labels.forEach(label => {
        console.log(label);
        textArr.push(label.description)
    });
    // console.log(textArr);
    return textArr
}

async function detectLanguage(fileName) {
    const client = new vision.ImageAnnotatorClient();
    const lclient = new language.LanguageServiceClient();

    // const fileName = './resources/329752910_2310907935755947_2807452803581570946_n.jpg';
    // Detects text in the image
    const [result] = await client.textDetection(fileName);
    const detections = result.textAnnotations;
    console.log(`Text: ${detections[0].description}`);

    const [classification] = await lclient.classifyText({
        document: {
            content: detections[0].description,
            type: 'PLAIN_TEXT'
        }
    });

    const languageCode = classification.languages[0].languageCode;
    console.log(`Language: ${languageCode}`);
}

async function getStreetView() {
    // const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';
    const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview';
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
        } else {
            console.error('No street view image found for the specified location.');
        }
    })
}

// inert to db
async function saveTodb(textArr, pano_id) {
    const sql = `INSERT INTO imgtotxt(pano_id,txt)VALUES('${pano_id}', '${textArr}')`
    db.query(sql).then(r => console.log("ok"))
}

async function detectLanguage(textArr) {
    const langDetect = new LanguageDetect();
    // langDetect.setLanguageType('iso2');

    const data = {}
    textArr.forEach(value => {
        const result = langDetect.detect(value);
        data[value] = (result.find(v => v[0] != null) || [null])[0];
    })
    console.log(data);
}

// detect Text
async function detectText(fileName, pano_id) {
    const client = new vision.ImageAnnotatorClient();
    const [result] = await client.textDetection(fileName);
    const detections = result.textAnnotations;
    let query = ['Google', '2012', '2013', '2023', '|', '-', ':', '.', '??', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
    // let textArr = await detections.filter(item => item.description.indexOf(query) < 0).map(item => item.description);
    let textArr = await detections.filter(item => item.description.indexOf(query[0]) < 0).filter(item => !query.includes(item.description)).map(item => item.description);
    await saveTodb(textArr, pano_id);
    await detectLanguage(textArr);
}

const getImage = (pano_id) => {
    streetview.saveImg({ id: pano_id, type: "google", fileName: './panorama/' })
    setTimeout(() => {
        detectText('./panorama/' + pano_id + '.png', pano_id)
    }, 1000)
}

const downloadStreetview = (url, fileName) => {
    const BASE_URL = 'https://maps.googleapis.com/maps/api/streetview/metadata';
    const lat = 50.450717;
    const lng = 30.523825;
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



// detectLabel()
downloadStreetview()
// landmarkDetection('./resources/doi.webp');
// faceDetection('./resources/woman2.jpeg')
// imageProperties('./resources/woman2.jpeg')
// logoDetection('./resources/market.jpeg')
// multipleObject('./resources/market.jpeg')

app.get('/img2text', (req, res) => {
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