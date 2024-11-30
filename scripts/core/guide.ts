import { Collection, Logger, DateTime, Storage, Zip } from '@freearhey/core'
import { Channel } from 'epg-grabber'
import { XMLTV } from '../core'
import { MinioStorage } from './storage'

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
    this.storage = filepath.startsWith('s3://') ? new MinioStorage() : new Storage()
  }

  async save() {
    const channels = this.channels.uniqBy(
      (channel: Channel) => `${channel.xmltv_id}:${channel.site}`
    )

    let guideContent = ''
    let isXml = false
    let isGzip = false

    // Get file extension and handle different cases
    const filepath = this.filepath.toLowerCase()
    switch(true) {
      case filepath.endsWith('.xml'):
        isXml = true
        break
      case filepath.endsWith('.xml.gz'):
      case filepath.endsWith('.xml.gzip'): 
        isXml = true
        isGzip = true
        break
      default:
        throw new Error('Invalid file extension. Only .xml, .xml.gz, .xml.gzip, and .json are supported')
    }

    if (isXml) {
      const xmltv = new XMLTV({
        channels: channels,
        programs: this.programs,
        date: this.date
      })
      guideContent = xmltv.toString()
    }

    this.logger.info(`  saving guide to "${this.filepath}"...`)
    if (isGzip) {
      const zip = new Zip()
      await this.storage.save(this.filepath, await zip.compress(guideContent))
    } else {
      await this.storage.save(this.filepath, guideContent)
    }

  }
}