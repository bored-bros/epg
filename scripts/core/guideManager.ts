import { Collection, Logger, StringTemplate } from '@freearhey/core'
import { OptionValues } from 'commander'
import { Channel, Program } from 'epg-grabber'
import { Guide } from '.'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { PromisyClass, TaskQueue } from 'cwait'

dayjs.extend(weekOfYear)

type GuideManagerProps = {
  options: OptionValues
  logger: Logger
  channels: Collection
  programs: Collection
}

export class GuideManager {
  options: OptionValues
  logger: Logger
  channels: Collection
  programs: Collection

  constructor({ channels, programs, logger, options }: GuideManagerProps) {
    this.options = options
    this.logger = logger
    this.channels = channels
    this.programs = programs
  }

  async createGuides() {
    const pathTemplate = new StringTemplate(this.options.output)

    const groupedChannels = this.channels
      .orderBy([(channel: Channel) => channel.xmltv_id])
      .uniqBy((channel: Channel) => `${channel.xmltv_id}:${channel.site}:${channel.lang}`)
      .groupBy((channel: Channel) => {
        return pathTemplate.format({ 
          lang: channel.lang || 'en', 
          site: channel.site || '', 
          channel: channel.xmltv_id || '' 
        })
      })

    const groupedPrograms = this.programs
      .orderBy([(program: Program) => program.channel, (program: Program) => program.start])
      .groupBy((program: Program) => {
        const date = dayjs(program.start)
        const lang =
          program.titles && program.titles.length && program.titles[0].lang
            ? program.titles[0].lang
            : 'en'
        return pathTemplate.format({ 
          lang: lang, 
          site: program.site || '', 
          channel: program.channel || '',
          date: date.format('YYYYMMDD'),
          day: date.daysInMonth(),
          month: date.month(),
          year: date.year(),
          week: date.week()
        })
      })

    const taskQueue = new TaskQueue(Promise as PromisyClass, this.options.maxConnections)
    const total = groupedPrograms.keys().length
    let i = 1

    await Promise.all(
      groupedPrograms.keys().map(
        taskQueue.wrap(
          async (groupKey: string) => {
            const guide = new Guide({
              filepath: groupKey,
              channels: new Collection(groupedChannels.get(groupKey)),
              programs: new Collection(groupedPrograms.get(groupKey)),
              date: this.options.date,
              logger: this.logger
            })
            await guide.save()
            this.logger.info(
              `  [${i}/${total}] saving to ${groupKey}`
            )
            if (i < total) i++
          }
        )
      )
    )
  }
}
