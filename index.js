import express from 'express';
import puppeteer from 'puppeteer';

let db = new Map
const app = express()

app.set('view engine', 'ejs')
app.set('views', './temp')
app.use(express.static('public'))
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
let port = 3001
app.listen(port, () => {
    console.log(`Server connect: http://localhost:${port}`)
    console.log(db)
})

async function runBot(imname) {
    if(imname == ''){
        return ['error', 'error', 'error']
    }
    const botDataDir ='C:\\Users\\админ\\Desktop\\Full Stack\\node js експрес\\work-admin\\my_bot_session'
    const browser = await puppeteer.launch({
        userDataDir: botDataDir,
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
    ]
    });
    const page = await browser.newPage();
    await page.goto('https://delivery-os.wolt.com/couriers');
    await page.waitForSelector('.cb_DataTable_Row_2be', {timeout:15000})
    let names = await page.$$eval('.cb_DataTable_Row_2be > .cb_DataTable_Column_2be:nth-child(2) > div > div > div:nth-child(1)', e => {return e.map((el) => el.innerText)});
    let count = 0
    let page_max_string = await page.$eval('footer > div > div > button:nth-child(2)', e => e.getAttribute('title'))
    let page_max_num = Number(page_max_string.slice(10))
    while (!(names.includes(imname))){
        await page.click('footer > div > div > button[title="Next page"]')
        count += 1
        await page.waitForSelector('.cb_DataTable_Row_2be', {timeout:15000})
        names = await page.$$eval('.cb_DataTable_Row_2be > .cb_DataTable_Column_2be:nth-child(2) > div > div > div:nth-child(1)', e => {return e.map((el) => el.innerText)});
        if(count == page_max_num){
            await browser.close()
            return ['error', 'error', 'error']
    }
    }
    await page.click(`.cb_DataTable_Row_2be:nth-child(${names.indexOf(imname) + 1})`,
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
};
