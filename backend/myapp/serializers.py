from rest_framework import serializers
from .models import JobDescription, JobRecruiter, VectorTable

class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = ['uuid', 'title', 'company', 'domain', 'description', 
                  'requirements', 'location', 'salary', 'contact_info', 
                  'application_link', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Add default values for fields not provided by the frontend
        if 'salary' not in validated_data:
            validated_data['salary'] = 0
        if 'contact_info' not in validated_data:
            validated_data['contact_info'] = ""
        if 'application_link' not in validated_data:
            validated_data['application_link'] = ""
            
        return JobDescription.objects.create(**validated_data)

class DomainSerializer(serializers.Serializer):
    domain = serializers.CharField()