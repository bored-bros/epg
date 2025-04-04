const { url, parser } = require('./cubmu.com.config.js')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const date = dayjs.utc('2023-11-05', 'DD/MM/YYYY').startOf('d')
const channel = { site_id: '4028c68574537fcd0174be43042758d8', xmltv_id: 'TransTV.id', lang: 'id' }
const channelEn = Object.assign({}, channel, { lang: 'en' })

it('can generate valid url', () => {
  expect(url({ channel, date })).toBe(
    'https://servicebuss.transvision.co.id/v2/cms/getEPGData?app_id=cubmu&tvs_platform_id=standalone&schedule_date=2023-11-05&channel_id=4028c68574537fcd0174be43042758d8'
  )
})

it('can parse response', () => {
  const content =
    '{"result":[{"channel_id":"4028c68574537fcd0174be43042758d8","channel_name":"Trans TV","scehedule_title":"CNN Tech News","schedule_date":"2023-11-05 01:30:00","schedule_end_time":"02:00:00","schedule_json":{"availability":0,"channelId":"4028c68574537fcd0174be43042758d8","channelName":"Trans TV","duration":1800,"editable":true,"episodeName":"","imageUrl":"https://cdnjkt2.transvision.co.id:1001/catchup/schedule/thumbnail/4028c68574537fcd0174be43042758d8/4028c6858b8b3621018b9330e3701a7e/458x640","imageUrlWide":"https://cdnjkt2.transvision.co.id:1001/catchup/schedule/thumbnail/4028c68574537fcd0174be43042758d8/4028c6858b8b3621018b9330e3701a7e/320x180","name":"CNN Tech News","ottImageUrl":"","primarySynopsis":"CNN Indonesia Tech News adalah berita teknologi yang membawa pemirsa ke dunia teknologi yang penuh dengan informasi, pendidikan, hiburan sampai informasi kesehatan terkini.","scheduleId":"4028c6858b8b3621018b9330e3701a7e","scheduleTime":"18:30:00","secondarySynopsis":"CNN Indonesia Tech News is tech news brings viewers into the world of technology that provides information, education, entertainment to the latest health information.","startDt":"20231104183000","url":""},"schedule_start_time":"01:30:00"}]}'

  const idResults = parser({ content, channel })
  expect(idResults).toMatchObject([
    {
      start: '2023-11-04T18:30:00.000Z',
      stop: '2023-11-04T19:00:00.000Z',
      title: 'CNN Tech News',
      description:
        'CNN Indonesia Tech News adalah berita teknologi yang membawa pemirsa ke dunia teknologi yang penuh dengan informasi, pendidikan, hiburan sampai informasi kesehatan terkini.'
    }
  ])

  const enResults = parser({ content, channel: channelEn })
  expect(enResults).toMatchObject([
    {
      start: '2023-11-04T18:30:00.000Z',
      stop: '2023-11-04T19:00:00.000Z',
      title: 'CNN Tech News',
      description:
        'CNN Indonesia Tech News is tech news brings viewers into the world of technology that provides information, education, entertainment to the latest health information.'
    }
  ])
})

it('can handle empty guide', () => {
  const results = parser({ content: '' })

  expect(results).toMatchObject([])
})
