import { Collection, DateTime, Logger, StringTemplate } from '@freearhey/core'
import { OptionValues } from 'commander'
import { Channel, Program } from 'epg-grabber'
import { Guide } from '.'

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
    const currDate = new DateTime(process.env.CURR_DATE || new Date().toISOString(), { zone: 'UTC' })

    const groupedChannels = this.channels
      .orderBy([(channel: Channel) => channel.xmltv_id])
      .uniqBy((channel: Channel) => `${channel.xmltv_id}:${channel.site}:${channel.lang}`)
      .groupBy((channel: Channel) => {
        return pathTemplate.format({ lang: channel.lang || 'en', site: channel.site || '', id: channel.xmltv_id || '' })
      })

    const groupedPrograms = this.programs
      .orderBy([(program: Program) => program.channel, (program: Program) => program.start])
      .groupBy((program: Program) => {
        const lang =
          program.titles && program.titles.length && program.titles[0].lang
            ? program.titles[0].lang
            : 'en'
        return pathTemplate.format({ 
          lang: lang, 
          site: program.site || '', 
          channel: program.channel || '', 
          day: currDate.toJSDate().getDay(),
          month: currDate.toJSDate().getMonth()+1,
          year: currDate.toJSDate().getFullYear()
        })
      })

    for (const groupKey of groupedPrograms.keys()) {
      const guide = new Guide({
        filepath: groupKey,
        channels: new Collection(groupedChannels.get(groupKey)),
        programs: new Collection(groupedPrograms.get(groupKey)),
        date: currDate,
        logger: this.logger
      })

      await guide.save()
    }
  }
}
