const express = require('express')
const app = express()
const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')

app.get('/', function (req, res) {
    // get products urls from xml sitemap
    const url = "https://www.ikea.com/domainwide-sitemaps/cat-fr_FR_1.xml";
    let productsUrl = [];
    

    const getData = async url => {
        try {
            const response = await axios.get(url);
            const data = response.data;
            const $ = cheerio.load(data);
            let urls = []
            $('loc').each(function (i, e) {
                urls[i] = $(this).text();
            });
            urls.forEach(url => getProductPage(url))
        } catch (error) {
            console.log(error);
        }
    };
    getData(url);
    
    const getProductPage = async product => {
        try {
            const response = await axios.get(product);
            const data = response.data;
            const $ = cheerio.load(data);
            const cat = $('.range-page-title__title').text();
            $('.product-compact__spacer a').each(function (i, e) {
                productsUrl.push($(this).attr('href'));
            })
            const nextPage = $('.pagination__right').attr('href')
            if (nextPage) {
                getProductPage(nextPage);
            } else {
                const x = productsUrl.filter(el => !el.includes('openPopup'))
                const test = [...new Set(x)];
                console.log(test);
                fs.writeFileSync('urls.txt', test)
            }
        } catch (error) {
            // console.log(error);
        }
    };
})

app.get('/file', (req, res) => {
    fs.readFileSync('./urls.txt', function read(err, data) {
        if (err) {
            throw err;
        }

        console.log(data);
    })
})

app.listen(3000, () => console.log('server running'))