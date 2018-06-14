export class EventEmitter {
  private subscriptions: Map<string, Set<( payload: any ) => void>>;

  get listenersCount() {
    return this.subscriptions.size;
  }

  constructor() {
    this.subscriptions = new Map();

    this.emit = this.emit.bind( this );
    this.once = this.once.bind( this );
    this.on = this.on.bind( this );
    this.off = this.off.bind( this );
    this.has = this.has.bind( this );
    this.clear = this.clear.bind( this );
  }

  public emit( name, payload?: object ) {
    const listeners = this.subscriptions.get( name );

    if ( listeners ) {
      listeners.forEach( ( cb ) => cb( payload ) );
    }
  }

  public once( name, callBack ) {
    const cb = ( ...args ) => {
      callBack( ...args );
      this.off( name, cb );
    };

    this.on( name, cb );
  }

  public has( name, callBack ) {
    const listeners = this.subscriptions.get( name );

    if ( listeners ) {
      return listeners.has( callBack );
    }

    return false;
  }

  public on( name, callBack ) {
    const listeners = this.subscriptions.get( name );

    if ( listeners ) {
      if ( !listeners.has( callBack ) ) {
        listeners.add( callBack );
      } else {
        console.warn( `[ ${this.constructor.name} ][ ON ][ CALLBACK ][ ${name} ][ ALREADY_EXIST ]` );
      }
    } else {
      this.subscriptions.set( name, new Set( [ callBack ] ) );
    }
  }

  public off( name, callBack ) {
    const listeners = this.subscriptions.get( name );

    if ( listeners ) {
      if ( listeners.has( callBack ) ) {
        listeners.delete( callBack );
      } else {
        console.warn( `[ ${this.constructor.name} ][ OFF ][ CALLBACK ][ ${name} ][ NOT_EXIST ]` );
      }
    } else {
      console.error( `[ ${this.constructor.name} ][ OFF ][ SUBSCRIPTION ][ ${name} ][ NOT_EXIST ]` );
    }

  }

  public clear() {
    this.subscriptions.forEach( ( list ) => list.clear() );
    this.subscriptions.clear();
  }
}
