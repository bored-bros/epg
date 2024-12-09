import { Logger, Storage, Collection } from '@freearhey/core'
import { ChannelsParser } from '../../core'
import path from 'path'
import { SITES_DIR, API_DIR } from '../../constants'
import { Channel } from 'epg-grabber'
import { S3Storage } from '../../core/storage'

type OutputItem = {
  channel: string | null
  site: string
  site_id: string
  site_name: string
  lang: string
}

async function main() {
  const logger = new Logger()

  logger.start('staring...')

  logger.info('loading channels...')
  const sitesStorage = new Storage(SITES_DIR)
  const parser = new ChannelsParser({ storage: sitesStorage })

  let files: string[] = []
  files = await sitesStorage.list('**/*.channels.xml')

  let parsedChannels = new Collection()
  for (const filepath of files) {
    parsedChannels = parsedChannels.concat(await parser.parse(filepath))
  }

  logger.info(`  found ${parsedChannels.count()} channel(s)`)

  const output = parsedChannels.map((channel: Channel): OutputItem => {
    return {
      channel: channel.xmltv_id || null,
      site: channel.site || '',
      site_id: channel.site_id || '',
      site_name: channel.name,
      lang: channel.lang || ''
    }
  })

  const apiStorage = API_DIR.startsWith('s3://') ? new S3Storage() : new Storage(API_DIR)
  const outputFilename = 'guides.jsonl'
  const outputContent = output.map(item => JSON.stringify(item)).join('\n')
  await apiStorage.save(outputFilename, outputContent)

  logger.info(`saved to "${path.join(API_DIR, outputFilename)}"`)
}

main()
