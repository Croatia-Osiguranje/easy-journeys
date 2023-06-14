import { Model } from './model';
import { Nonce } from './nounce';

/**
 * Information  (like, expiry, version, reload protection) is stored in localstorage
 * Theese information are needed to suceesfuly load from session .
 */
export class SessionMeta extends Model {
  id!: string;
  expires!: number;
  version!: string;
  nonces: Array<Nonce> = [];

  /**
   * Add Nonce to Session Meta
   * @param nonce Nonce object to store
   */
  addNonce(nonce: Nonce): void {
    this.nonces.push(nonce);
  }

  /**
   * Removes Nonce from SessionMeta
   * @param nonceId UUID of the nonce
   * @returns boolean
   */
  removeNonce(nonceId: string): boolean {
    this.nonces = this.nonces.filter((nonce) => nonce.id !== nonceId);
    return true;
  }

  /**
   * Returns nunce by nonceId
   * @param nonceId UUID of the nonce
   */
  getNonce(nonceId: string): Nonce | undefined {
    return this.nonces.find((nonce) => nonce.id === nonceId);
  }

  /**
   * Checks if nonce already exists
   */
  stepHasNonce(nonceId: string): boolean {
    return !!this.getNonce(nonceId);
  }

  /**
   * Retruns Nonce by stepId
   * @param stepId Id of the step to search nonce
   */
  getNonceByStepId(stepId: string): Nonce | undefined {
    return this.nonces.find((nonce) => nonce.stepId === stepId);
  }
}
