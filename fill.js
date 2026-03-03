import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = new Map
const app = express()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'temp'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    const dataForRender = {
    name: '', 
    dilcount: '', 
    datareg: '',
    alertinfo: '' 
    };
    res.render('index', dataForRender);
});

app.post('/datasub', async (req, res) => {
    let name_cour = req.body.info
    if(db.has(name_cour)){
        res.render('index', {name: name_cour, dilcount: db.get(name_cour)[0], datareg: db.get(name_cour)[1], alertinfo: '' });
    }
    else{
        let answer = (await runBot(name_cour))
        res.render('index', {name: answer[2], dilcount: answer[0], datareg: answer[1], alertinfo: '' });
    }
})
app.post('/cleardata',function (req, res) {
    let c = req.body.refresh
    if(c == 'очистить'){
         db.clear()
         const dataForRender = {
        name: '', 
        dilcount: '', 
        datareg: '',
        alertinfo: 'ДАННЫЕ ОЧИЩЕНЫ' 
        };
        res.render('index', dataForRender);
    }
    else{
        const dataForRender = {
        name: '', 
        dilcount: '', 
        datareg: '',
        alertinfo: 'ПОЖАЛУЙСТА ВВЕДИТЕ ОЧИСТИТЬ' 
        };
    res.render('index', dataForRender);
    }
})
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server connect: http://localhost:${port}`);
});
async function runBot(imname) {
    if (!imname) return ['error', 'error', 'error'];

    const targetDir = path.join(__dirname, 'wolt-data');

    let browser;
    let page;
    try {
        const options = {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--disable-blink-features=AutomationControlled',
            ],
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            headless: false,
            userDataDir: targetDir, 
        };

        browser = await puppeteer.launch(options);

        page = await browser.newPage();

        await page.goto('https://delivery-os.wolt.com/couriers');

        await page.waitForFunction(() => {
            const tbody = document.querySelector('tbody');
            return tbody && tbody.innerText.length > 10;
        }, { timeout: 15000 });
        let names = await page.$$eval('tbody > tr > td:nth-child(2) > div > div > div:nth-child(1)', e => {return e.map((el) => el.innerText)});
        let count = 0
        let page_max_string = await page.$eval('footer > div > div > button:nth-child(2)', e => e.getAttribute('title'))
        let page_max_num = Number(page_max_string.slice(10))
        while (!(names.includes(imname))){
         await page.click('footer > div > div > button[title="Next page"]')
         count += 1
         if(count == page_max_num){
            await browser.close()
            return ['error', 'error', 'error']
        }
        }
        await page.click(`tbody > tr:nth-child(${names.indexOf(imname) + 1})`,
        {
        button: 'left',
        delay: 100,
        })
        await new Promise(r => setTimeout(r, 2000));
        let data_c = await page.$eval('.cb_ModalContent_Root_954 > div > section[aria-label="Details"] > ul >  li:nth-child(5) > div:nth-child(2)', e => e.innerText)
        await page.click('section[aria-label="Basic information"]>div:nth-child(2)>div:nth-child(4)>button')
        await page.click('button[role="menuitem"]')
        await new Promise(r => setTimeout(r, 2000)) 
        await page.click('div[role="presentation"]:nth-child(2)')
        await new Promise(r => setTimeout(r, 2000))
        let count_delivery = await page.$eval('li[role="listitem"] > div > ul > li:nth-child(4) > div:nth-child(1)', e => e.innerText)
        await page.click('div[role="group"]>div>a[title="All couriers"]')
        await new Promise(r => setTimeout(r, 2000)) 
        await browser.close()
        db.set(imname, [count_delivery, data_c])
        return [count_delivery, data_c, imname]
    } catch (error) {
        console.error('ПРОИЗОШЛА ОШИБКА:', error.message);
        if (browser) await browser.close();
        return ['error', 'error', 'error'];
    }
}
