import CryptoJS from 'crypto-js'

export class CryptoUtil {
  /**
   * 从字符串密钥生成加密密钥
   * @param keyString 用户输入的字符串密钥
   * @returns 标准化的密钥字符串
   */
  static generateKey(keyString: string): string {
    // 使用SHA-256哈希算法将字符串转换为固定长度的密钥
    return CryptoJS.SHA256(keyString).toString()
  }

  /**
   * 加密文本
   * @param plainText 要加密的明文
   * @param keyString 密钥字符串
   * @returns 加密后的数据（Base64编码）
   */
  static encrypt(plainText: string, keyString: string): string {
    try {
      const key = this.generateKey(keyString)

      // 使用AES加密
      const encrypted = CryptoJS.AES.encrypt(plainText, key).toString()

      return encrypted
    } catch (error) {
      console.error('Encryption failed:', error)
      throw new Error('加密失败，请检查密钥')
    }
  }

  /**
   * 解密文本
   * @param encryptedText 加密的文本
   * @param keyString 密钥字符串
   * @returns 解密后的明文
   */
  static decrypt(encryptedText: string, keyString: string): string {
    try {
      const key = this.generateKey(keyString)

      // 解密数据
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key)
      const plaintext = decrypted.toString(CryptoJS.enc.Utf8)

      if (!plaintext) {
        throw new Error('解密结果为空')
      }

      return plaintext
    } catch (error) {
      console.error('Decryption failed:', error)
      throw new Error('解密失败，请检查密钥')
    }
  }

  /**
   * 验证密钥格式是否有效
   * @param keyString 密钥字符串
   * @returns 是否有效
   */
  static validateKey(keyString: string): boolean {
    if (!keyString || keyString.trim().length === 0) {
      return false
    }

    // 密钥长度要求：至少8个字符
    if (keyString.trim().length < 8) {
      return false
    }

    return true
  }

  /**
   * 测试密钥是否可用
   * @param keyString 密钥字符串
   * @returns 是否可用
   */
  static testKey(keyString: string): boolean {
    try {
      const testText = 'test'
      const encrypted = this.encrypt(testText, keyString)
      const decrypted = this.decrypt(encrypted, keyString)
      return testText === decrypted
    } catch (error) {
      return false
    }
  }
}

/**
 * ASE密钥管理类
 */
export class ASEKeyManager {
  private static readonly STORAGE_KEY = 'ASEToken'

  /**
   * 获取存储的ASE密钥
   */
  static getKey(): string | null {
    if (process.client) {
      return localStorage.getItem(this.STORAGE_KEY)
    }
    return null
  }

  /**
   * 保存ASE密钥
   */
  static setKey(key: string): void {
    if (process.client) {
      localStorage.setItem(this.STORAGE_KEY, key)
    }
  }

  /**
   * 删除ASE密钥
   */
  static removeKey(): void {
    if (process.client) {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  /**
   * 检查是否有ASE密钥
   */
  static hasKey(): boolean {
    return this.getKey() !== null
  }

  /**
   * 检查ASE密钥是否有效
   */
  static isKeyValid(): boolean {
    const key = this.getKey()
    if (!key) {
      return false
    }

    return CryptoUtil.validateKey(key) && CryptoUtil.testKey(key)
  }
}
