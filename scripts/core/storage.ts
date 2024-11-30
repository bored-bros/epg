import Minio from 'minio'
import { Storage } from '@freearhey/core'

export class MinioStorage extends Storage {
  private client: Minio.Client

  constructor() {
    super()
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!
    })
  }

  async save(filepath: string, content: ArrayBuffer) {
    const s3Path = filepath.replace('s3://', '')
    const [bucket, ...objectParts] = s3Path.split('/')
    const objectName = objectParts.join('/')
    const buffer = Buffer.from(content)

    let contentType = 'application/octet-stream'

    switch(true) {
      case filepath.endsWith('.gz'):
      case filepath.endsWith('.gzip'): 
        contentType = 'application/gzip'
        break
      case filepath.endsWith('.json'):
        contentType = 'application/json'
        break
      case filepath.endsWith('.xml'): 
        contentType = 'application/xml'
        break
      default:
        throw new Error('Invalid file extension.')
    }

    const metaData = {
      'Content-Type': contentType
    }

    await this.client.putObject(bucket, objectName, buffer, buffer.length, metaData)
  }
}
