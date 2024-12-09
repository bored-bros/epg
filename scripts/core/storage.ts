import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Storage } from '@freearhey/core'

export class S3Storage extends Storage {
  private client: S3Client
  private rootPath: string

  constructor(rootPath?: string) {
    super()
    this.rootPath = rootPath || ''
    this.client = new S3Client({
      forcePathStyle: true,
      region: process.env.S3_REGION!,
      endpoint: process.env.S3_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_ACCESS_SECRET!,
      }
    })
  }

  async save(filepath: string, content: ArrayBuffer) {
    const s3Path = filepath.replace('s3://', '')
    const [bucket, ...objectParts] = s3Path.split('/')
    const objectName = this.rootPath ? `${this.rootPath}/${objectParts.join('/')}` : objectParts.join('/')
    const buffer = Buffer.from(content)

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectName,
        Body: buffer,
      })
    )
  }
}
