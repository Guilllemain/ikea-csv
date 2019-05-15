const express = require('express')
const app = express()
const axios = require('axios')
const cheerio = require('cheerio')
const products = require('./urls');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: 'ikea.csv',
    header: [
        { id: 'url', title: 'Url' },
        { id: 'category', title: 'Category' },
        { id: 'id', title: 'Article number' },
        { id: 'title', title: 'Title' },
        { id: 'price', title: 'Price' },
        { id: 'description', title: 'Description' },
        { id: 'dimensions', title: 'Dimensions' },
        { id: 'mainImage', title: 'Image url' },
        { id: 'additionalImages', title: 'Additional images url' },
        { id: 'packagesNumber', title: 'Packages number' },
        { id: 'packagesDetails', title: 'Packages details' },
        { id: 'variations', title: 'Variations' },
    ]
});

const data = [];

let productsUrl;

app.get('/', function (req, res) {
    // get products urls from xml sitemap
    const mainUrl = "https://www.ikea.com/domainwide-sitemaps/cat-en_AE_1.xml";
    

    const getData = async url => {
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            let categoriesUrl = []
            $('loc').each(function (i, e) {
                categoriesUrl[i] = $(this).text();
            });
            categoriesUrl.forEach(url => getProductPage(url))
        } catch (error) {
            console.log(error);
        }
    };
    getData(mainUrl);
    
    const getProductPage = async categoryUrl => {
        try {
            const response = await axios.get(categoryUrl);
            const $ = cheerio.load(response.data);
            const urls = []
            $('.product-compact__spacer a').each(function (i, e) {
                urls.push($(this).attr('href'));
            })
            const nextPage = $('.pagination__right').attr('href')
            if (nextPage) {
                getProductPage(nextPage);
            } else {
                const u = urls.filter(el => !el.includes('openPopup'))
                productsUrl = [...new Set(u)];
            }
        } catch (error) {
            // console.log(error);
        }
    };
})

app.get('/products', (req, res) => {
    res.write(productsUrl);
})

app.get('/file', (req, res) => {
    // productsUrl.forEach(url => getProductInfo(url))
    getProductInfo(products[0])
})

const getProductInfo = async url => {
    try {
        const response = await axios.get('https://www.ikea.com/ae/en/p/hamarvik-sprung-mattress-medium-firm-dark-beige-50244388/');
        const $ = cheerio.load(response.data);
        const category = $('.range-breadcrumb__list-item span').first().text();
        const title = $('.range-breadcrumb__list-item--active a span').text();
        const price = $('.product-pip__price__value').first().text();
        const id = $('.product-pip').data('product-id');
        const rawDescription = []
        $('#pip_product_description p').each(function (i, e) {
            rawDescription[i] = $(this).text()
        })
        const description = rawDescription.join(' ')
        const dimensions = []
        $('.product-pip__definition-list-item-container').each(function(i, e) {
            dimensions[i] = $(this).children().text()
        })
        const mainImage = $('.range-carousel__image img').first().attr('src')
        const rawImages = []
        $('.range-carousel__image img').each(function (i, e) {
            rawImages[i] = $(this).attr('src')
        })
        const additionalImages = rawImages.slice(1).join("\n")
        console.log(additionalImages)
        const packagesNumber = $('#pip_package_details h5').length
        const packagesDetails = []
        let details = []
        $('#pip_package_details h5').parent().each(function(i, e) {
            $(this).children().each(function (j, e) {
                details.push($(this).text())
            })
            $(this).next().each(function (i, e) {
                $(this).children().each(function (i, e) {
                    details.push($(this).text().trim().replace('\n', '').replace(/ /g, '').replace(':', ': '))
                })
            })
            packagesDetails.push(details)
            details = []
        })
        const variations = []
        let variationsDesc = []
        let variationsDetails = []
        $('.product-pip__criterias__criteria').each(function(i, e) {
            variationsDesc.push($(this).data('criteria-name'))
            $(this).find('.product-variation__label').each(function(i, e) {
                variationsDetails.push($(this).text().trim())
            })
            variationsDesc.push(variationsDetails)
            variations.push(variationsDesc)
            variationsDesc = []
            variationsDetails = []
        })

        data.push({
            url,
            category, 
            id,
            title,
            price,
            description,
            dimensions,
            mainImage,
            additionalImages,
            packagesNumber,
            packagesDetails,
            variations,
        })
        csvWriter
            .writeRecords(data)
            .then(() => console.log('The CSV file was written successfully'));
    } catch (error) {
        console.log(error);
    }
}
app.listen(3000, () => console.log('server running'))