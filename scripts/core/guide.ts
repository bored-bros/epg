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

function nameToUpperCase(value, name){
  console.log(value)
  console.log(name)
  return name
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
    let isGzip = false

    // Get file extension and handle different cases
    const filepath = this.filepath.toLowerCase()
    switch(true) {
      case filepath.endsWith('.xml'):
        isXml = true
        break
      case filepath.endsWith('.json'):
        isJson = true
        break
      case filepath.endsWith('.xml.gz'):
      case filepath.endsWith('.xml.gzip'): 
        isXml = true
        isGzip = true
        break
      case filepath.endsWith('.json.gz'):
      case filepath.endsWith('.json.gzip'): 
        isJson = true
        isGzip = true
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

    if (isJson) {
      const xml2js = require('xml2js')
      const result = await xml2js.parseStringPromise(xmltv.toString(), {mergeAttrs: true, explicitArray: false, trim: true, normalize: true})
      guideContent = JSON.stringify(result.tv, null, 2)
    }

    if (isGzip) {
      const zip = new Zip()
      await this.storage.save(this.filepath, await zip.compress(guideContent))
    } else {
      await this.storage.save(this.filepath, guideContent)
    }

  }
}