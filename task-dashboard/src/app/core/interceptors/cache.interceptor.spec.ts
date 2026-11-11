import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { cacheInterceptor, clearHttpCache } from './cache.interceptor';

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    clearHttpCache();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    clearHttpCache();
  });

  it('caches GET responses and clears on mutation', () => {
    let first = '';
    http.get<string>('/api/tasks').subscribe((value) => (first = value as unknown as string));
    httpMock.expectOne('/api/tasks').flush({ ok: true });

    http.get('/api/tasks').subscribe();
    httpMock.expectNone('/api/tasks');

    http.post('/api/tasks', {}).subscribe();
    httpMock.expectOne('/api/tasks').flush({});

    http.get('/api/tasks').subscribe();
    httpMock.expectOne('/api/tasks').flush({ ok: true });
    expect(first).toBeTruthy();
  });
});
