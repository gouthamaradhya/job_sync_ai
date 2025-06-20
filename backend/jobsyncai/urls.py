from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from myapp import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('upload_resume/', views.upload_resume, name='upload_resume'),
    path('analyze-resume/', views.analyze_resume, name='analyze_resume'),
    path('api/jobs/domain/', views.get_jobs_by_domain, name='jobs_by_domain'),
    path('api/domains/', views.get_all_domains, name='get_all_domains'),
    path('api/recruiters/upload-job/', views.upload_job_posting, name='upload_job_posting'),
    path('api/domains/', views.get_domains, name='get_domains'),
    path('upload-job-posting/', views.upload_job_posting, name='upload_job_posting'),# New URL
    path('api/upload-job-posting/', views.upload_job_posting, name='upload_job_posting'),
]

# Serve media files in development (for local testing)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)