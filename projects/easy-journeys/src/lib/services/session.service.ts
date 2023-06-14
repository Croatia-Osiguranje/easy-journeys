import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Session } from '../models/session';
import { of, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SessionMeta } from '../models/session-meta';
import { Nonce } from '../models/nounce';
import { JourneyError } from '../exceptions/journey.exception';
import { GlobalConfig } from '../models/global.config';
import { FOR_ROOT_CONFIG_TOKEN } from '../journey.config';
import { DateHelper } from '../helpers/date.helper';
import { DurationModel } from '../models/duration-model';
import { SessionConfig } from '../models/session.config';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  /**
   * Id of the journey to store session for
   */
  journeyId!: string;

  /**
   * UUID of the created session
   */
  sessionId!: string;

  /**
   * Combination of application namespace with journeyId
   */
  sessionStorageKey!: string;

  /**
   * Indicates if application has successfully loaded from session
   */
  active = false;

  /**
   * Session configuration
   */
  sessionConfig!: SessionConfig;

  constructor(
    private http: HttpClient,
    @Inject(FOR_ROOT_CONFIG_TOKEN) private globalConfig: GlobalConfig // private injector: Injector
  ) {}

  /**
   * Checks if valid session exist in localstorage if true tries to laod the session, on failiure returns null as observabe
   * @param config Configuration for successfuly checking an fetching session data
   * @returns Session data as observable
   */
  onInit(config: {
    journeyId: string;
    sessionConfig: SessionConfig;
    canLoadFromSession?: boolean;
  }): Observable<Session | null> {
    this.journeyId = config.journeyId;
    this.sessionConfig = config.sessionConfig;
    this.sessionStorageKey = this.createSessionStorageKey();

    if (this.hasValidSession()) {
      this.sessionId = this.getSessionMeta().id;
    }

    if (config.canLoadFromSession && this.hasValidSession()) {
      return this.getSessionData()
        .pipe(
          tap(() => {
            this.active = true;
          })
        )
        .pipe(
          catchError((error) => {
            this.removeSession();
            this.active = false;
            return of(null);
          })
        );
    }

    this.active = false;
    return of(null);
  }

  /**
   * Gets session Meta data neccessary for retriving session from backend
   * @returns SesssionMeta object
   */
  getSessionMeta(): SessionMeta {
    const session = localStorage.getItem(this.sessionStorageKey);
    if (!session) {
      return new SessionMeta();
    }
    const sesssionMeta = JSON.parse(session) as SessionMeta;
    return new SessionMeta().loadModel(sesssionMeta);
  }

  /**
   * Saves session Metadata into localstorage
   */
  saveSessionMeta(sessionMeta: SessionMeta): void {
    localStorage.setItem(this.sessionStorageKey, JSON.stringify(sessionMeta));
  }

  /**
   * Checks if session for that key exists.
   * @returns boolean
   */
  hasSession(): boolean {
    return !!this.sessionConfig && !!localStorage.getItem(this.sessionStorageKey);
  }

  /**
   * The Journey has ben actually loaded from session
   * @returns boolean
   */
  isSessionActive(): boolean {
    return this.active;
  }

  /**
   * Check if Journey has already an active and valid (within 15 days) session
   * @returns boolean
   */
  hasValidSession() {
    if (!this.hasSession()) {
      return false;
    }

    const session = this.getSessionMeta();
    const currentTime = DateHelper.getUnix(new Date());
    return DateHelper.isBefore(currentTime, session.expires) && session.version === this.sessionConfig.version;
  }

  /**
   * Generates session metadata and session data
   * Uses persistSession function to save data on backend and save metadata to Local Storage
   * @param data Steps data to be saved
   */
  createSession(session: Session): void {
    if (!this.sessionConfig) {
      return;
    }
    this.sessionId = this.sessionId || crypto.randomUUID();
    const sessionEndDate = DateHelper.add(new Date(), this.sessionConfig.expires);
    const sessionEnd = DateHelper.getUnix(sessionEndDate);

    const sessionMeta = new SessionMeta();
    sessionMeta.id = this.sessionId;
    sessionMeta.expires = sessionEnd;
    sessionMeta.version = this.sessionConfig.version;

    this.persistSession(sessionMeta, session);
  }

  /**
   * Tries to save Journey step data to API, on success, saves session meta to local storage
   * Fails silently, only logging error to logger, not interupting user
   * @param sessionMeta Session info that goes to local storage
   * @param session Session data that goes to API
   */
  persistSession(sessionMeta: any, session: any) {
    try {
      this.http.put(`${this.sessionConfig.apiURL}/${this.sessionId}`, session).subscribe(() => {
        this.saveSessionMeta(sessionMeta);
        this.active = true;
      });
    } catch (err) {
      this.active = false;
      // this.logger.error('Unable to save session and Session meta data.', err);
    }
  }

  /**
   * Removes the session for specific Journey
   */
  removeSession(): void {
    this.active = false;
    localStorage.removeItem(this.sessionStorageKey);
  }

  /**
   * Tries to update session data on backend.
   * Session data is always overwriten by new one
   * On failiure falls back silently, only logs error
   * @param session session object to save to backend
   */
  updateSession(session: Session): void {
    try {
      this.http.put(`${this.sessionConfig.apiURL}/${this.sessionId}`, session).subscribe();
    } catch (err) {
      // Just log to logger dont notify user
      // this.logger.error('Unable to save session data to API.', err);
    }
  }

  /**
   * Updates session on backend returns observable
   * @param session Session object
   */
  ensureUpdateSession(session: Session): Observable<Session> {
    return this.http.put<Session>(`${this.sessionConfig.apiURL}/${this.sessionId}`, session);
  }

  /**
   * Creates session storage key from environment namespace and journeyId
   * @returns string
   */
  createSessionStorageKey(): string {
    return `${this.globalConfig.localStorage.nameSpace}-${this.journeyId}`;
  }

  /**
   * retreives sessionStorageKey
   * @returns string
   */
  getSessionStorageKey(): string {
    return this.sessionStorageKey;
  }

  /**
   * Retreives expiry date of the session if session exists
   * @returns string
   */
  getExpiry(): string | null {
    if (!this.hasSession()) {
      return null;
    }
    const session = this.getSessionMeta();
    const dateFromUnix = DateHelper.fromUnixTime(session.expires);
    return DateHelper.formatDate(dateFromUnix, 'dd MM yyyy HH:mm:ss');
  }

  /**
   * Retreives session data from API
   * @returns Session object as observable
   */
  getSessionData(): Observable<Session> {
    return this.http.get<Session>(`${this.sessionConfig.apiURL}/${this.sessionId}`);
  }

  /**
   * Gets session meta from localStorage.
   * Saves nonce for step to session meta. If nonce for step already exists removes it
   * @param stepId nonce is stored by stepId
   * @param expires expiry time of nonce
   */
  createNonce(stepId: string, expires?: DurationModel): Nonce {
    if (!this.isSessionActive()) {
      throw new JourneyError('Cant create nonce if session does not exist in localStorage!!!');
    }

    const exp = expires || this.sessionConfig.nonceDefaultExpiry;
    const appendedDate = DateHelper.add(new Date(), { ...exp });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const _exp = DateHelper.getUnix(appendedDate);

    const nonce = new Nonce(stepId, _exp);

    const sessionMeta = this.getSessionMeta();

    const existingNonce = sessionMeta.getNonceByStepId(stepId);

    if (existingNonce) {
      sessionMeta.removeNonce(existingNonce.id);
    }

    sessionMeta.addNonce(nonce);
    this.saveSessionMeta(sessionMeta);

    return nonce;
  }

  /**
   * Checks if nonce exist and if its not expired
   * @param nonceId UUID of nonce
   */
  isNonceValid(nonceId: string): boolean {
    const sessionMeta = this.getSessionMeta();
    const nonce = sessionMeta.getNonce(nonceId);

    if (!nonce) {
      return false;
    }

    const currentTime = DateHelper.getUnix(new Date());
    sessionMeta.removeNonce(nonce.id);
    this.saveSessionMeta(sessionMeta);
    return DateHelper.isBefore(currentTime, nonce.expires);
  }

  /**
   * Check if sessionId loaded in App #this.sessionId is different than one saved in localstorage
   */
  hasSessionIdMismatch() {
    if (!this.sessionId || !this.getSessionMeta().id) {
      return false;
    }
    return this.sessionId !== this.getSessionMeta().id;
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }
}
