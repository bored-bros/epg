import { EPGGrabber, GrabCallbackData, EPGGrabberMock, SiteConfig, Channel, Program } from 'epg-grabber'
import { Logger, Collection } from '@freearhey/core'
import { Queue } from './'
import { GrabOptions } from '../commands/epg/grab'
import { TaskQueue, PromisyClass } from 'cwait'

type GrabberProps = {
  logger: Logger
  queue: Queue
  options: GrabOptions
}

export class Grabber {
  logger: Logger
  queue: Queue
  options: GrabOptions

  constructor({ logger, queue, options }: GrabberProps) {
    this.logger = logger
    this.queue = queue
    this.options = options
  }

  async grab(): Promise<{ channels: Collection; programs: Collection }> {
    const taskQueue = new TaskQueue(Promise as PromisyClass, this.options.maxConnections)

    const total = this.queue.size()

    const channels = new Collection()
    let programs = new Collection()
    let i = 1

    await Promise.all(
      this.queue.items().map(
        taskQueue.wrap(
          async (queueItem: { channel: Channel; config: SiteConfig; date: string }) => {
            const { channel, config, date } = queueItem
            const grabber = process.env.NODE_ENV === 'test' ? new EPGGrabberMock(config) : new EPGGrabber(config)


            if (this.options.timeout !== undefined) {
              const timeout = parseInt(this.options.timeout)
              config.request = { ...config.request, ...{ timeout } }
            }

            if (this.options.delay !== undefined) {
              const delay = parseInt(this.options.delay)
              config.delay = delay
            }

            try {
              let retryCount = 0
              let success = false
              let _programs
              
              while (!success && retryCount < 2) {
                try {
                  _programs = await grabber.grab(
                    channel,
                    date,
                    (data: GrabCallbackData, error: Error | null) => {
                      const { programs, date } = data
                      if (error) {
                        this.logger.info(
                          `  [${i}/${total}] ${channel.site} (${channel.lang}) - ${
                            channel.xmltv_id
                          } - ${date.format('MMM D, YYYY')} (ERROR)`
                        )
                      } else {
                        this.logger.info(
                          `  [${i}/${total}] ${channel.site} (${channel.lang}) - ${
                            channel.xmltv_id
                          } - ${date.format('MMM D, YYYY')} (${programs.length} programs)`
                        )
                      }
                    }
                  )
                  success = true
                } catch (error) {
                  retryCount++
                  if (retryCount < 2) {
                    this.logger.info(
                      `  [${i}/${total}] ${channel.site} (${channel.lang}) - ${
                        channel.xmltv_id
                      } - ${date} (ERROR) - Retrying later...`
                    )
                    await new Promise(resolve => setTimeout(resolve, 10000))
                  } else {
                    this.logger.info(
                      `  [${i}/${total}] ${channel.site} (${channel.lang}) - ${
                        channel.xmltv_id
                      } - ${date} (ERROR) - Max retries reached`
                    )
                    this.logger.debug(error)
                  }
                }
              }
              
              if (success) {
                channels.add(channel)
                programs = programs.concat(new Collection(_programs))
              }
            } finally {
              if (i < total) i++
            }
          }
        )
      )
    )

    return { channels, programs }
  }
}
