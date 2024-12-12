import { Collection, Logger, DateTime, Storage, Zip } from '@freearhey/core'
import { Channel } from 'epg-grabber'
import { XMLTV } from '../core'
import { S3Storage } from './storage'
import 'xml2js'

type GuideProps = {
  channels: Collection
  programs: Collection
  date: DateTime
  logger: Logger
  filepath: string
}

export class Guide {
  channels: Collection
  programs: Collection
  date: DateTime
  logger: Logger
  storage: Storage
  filepath: string

  constructor({ channels, programs, date, logger, filepath }: GuideProps) {
    this.channels = channels
    this.programs = programs
    this.date = date
    this.logger = logger
    this.filepath = filepath
    this.storage = filepath.startsWith('s3://') ? new S3Storage() : new Storage()
  }

  async save() {
    const channels = this.channels.uniqBy(
      (channel: Channel) => `${channel.xmltv_id}:${channel.site}`
    )

    let guideContent = ''
    let isXml = false
    let isJson = false
    let isJsonLines = false
    let isCompressed = false

    // Get file extension and handle different cases
    const filepath = this.filepath.toLowerCase()
    isCompressed = filepath.endsWith('.gz') || filepath.endsWith('.gzip')
    const extension = isCompressed 
      ? filepath.replace(/\.(gz|gzip)$/, '').split('.').pop()
      : filepath.split('.').pop()

    switch (extension) {
      case 'xml':
        isXml = true
        break
      case 'json':
        isJson = true
        break
      case 'jsonl':
        isJsonLines = true
        break
      default:
        throw new Error('Invalid file extension. Only {xml,json} or {xml,json}.{gz,gzip} are supported')
    }

    const xmltv = new XMLTV({
      channels: channels,
      programs: this.programs,
      date: this.date
    })

    if (isXml) {
      guideContent = xmltv.toString()
    }

    if (isJsonLines) {
      // const programs: Array<{[key: string]: unknown}> = result.tv.programme
      guideContent= this.programs.map(program => {
        program.date = this.date.format('yyyy-mm-dd')
        program.title = program.titles[0]?.value
        program.lang = program.titles[0]?.lang
        delete program.titles
        program.subtitle = program.subTitles[0]?.value
        delete program.subTitles
        program.description = program.descriptions[0]?.value
        delete program.descriptions
        program.category = program.categories[0]?.value
        delete program.categories
        return JSON.stringify(program)
      }).join('\n')
    }

    if (isJson) {
      const xml2js = require('xml2js')
      const result = await xml2js.parseStringPromise(xmltv.toString(), {mergeAttrs: true, explicitArray: false, trim: true, normalize: true})
      guideContent = JSON.stringify(result.tv, null, 2)
    }

    if (isCompressed) {
      const zip = new Zip()
      await this.storage.save(this.filepath, await zip.compress(guideContent))
    } else {
      await this.storage.save(this.filepath, guideContent)
    }

  }
}