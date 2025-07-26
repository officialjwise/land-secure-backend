// Frontend Property Form Logic Example (React/Vue/Angular)

const PropertyForm = {
  // Form state management
  state: {
    propertyType: '',
    formData: {},
    visibleFields: [],
    availableSizeUnits: []
  },

  // Handle property type change
  onPropertyTypeChange(selectedType) {
    this.state.propertyType = selectedType;
    this.updateFormFields(selectedType);
    this.setDefaultValues(selectedType);
  },

  // Update visible fields based on property type
  updateFormFields(propertyType) {
    const fieldConfig = {
      land: {
        hideFields: ['bedrooms', 'bathrooms'],
        sizeUnits: ['sqm', 'acres', 'hectares'],
        defaultSizeUnit: 'acres'
      },
      house: {
        showFields: ['bedrooms', 'bathrooms'],
        sizeUnits: ['sqft', 'sqm'],
        defaultSizeUnit: 'sqft'
      },
      apartment: {
        showFields: ['bedrooms', 'bathrooms'],
        sizeUnits: ['sqft', 'sqm'],
        defaultSizeUnit: 'sqft'
      },
      commercial: {
        hideFields: ['bedrooms', 'bathrooms'],
        sizeUnits: ['sqft', 'sqm'],
        defaultSizeUnit: 'sqft'
      }
    };

    const config = fieldConfig[propertyType];
    if (config) {
      // Hide/show fields
      if (config.hideFields) {
        config.hideFields.forEach(field => {
          this.hideField(field);
          delete this.state.formData[field]; // Clear hidden field values
        });
      }
      
      if (config.showFields) {
        config.showFields.forEach(field => {
          this.showField(field);
        });
      }

      // Update size units
      this.state.availableSizeUnits = config.sizeUnits;
      this.state.formData.sizeUnit = config.defaultSizeUnit;
    }
  },

  // Set default values based on property type
  setDefaultValues(propertyType) {
    const defaults = {
      house: {
        bedrooms: 3,
        bathrooms: 2,
        sizeUnit: 'sqft'
      },
      apartment: {
        bedrooms: 2,
        bathrooms: 1,
        sizeUnit: 'sqft'
      },
      land: {
        sizeUnit: 'acres'
      },
      commercial: {
        sizeUnit: 'sqft'
      }
    };

    if (defaults[propertyType]) {
      Object.assign(this.state.formData, defaults[propertyType]);
    }
  },

  // Field visibility helpers
  hideField(fieldName) {
    const element = document.querySelector(`[data-field="${fieldName}"]`);
    if (element) {
      element.style.display = 'none';
      element.removeAttribute('required');
    }
  },

  showField(fieldName) {
    const element = document.querySelector(`[data-field="${fieldName}"]`);
    if (element) {
      element.style.display = 'block';
      // Add required attribute if needed
      if (['bedrooms', 'bathrooms'].includes(fieldName)) {
        element.setAttribute('required', 'true');
      }
    }
  },

  // Form validation based on property type
  validateForm() {
    const errors = [];
    const propertyType = this.state.formData.type;

    // Common validations
    if (!this.state.formData.title) errors.push('Title is required');
    if (!this.state.formData.price) errors.push('Price is required');
    if (!this.state.formData.sizeNumber) errors.push('Size is required');

    // Property-specific validations
    if (['house', 'apartment'].includes(propertyType)) {
      if (!this.state.formData.bedrooms) errors.push('Bedrooms is required for houses/apartments');
      if (!this.state.formData.bathrooms) errors.push('Bathrooms is required for houses/apartments');
    }

    return errors;
  },

  // Submit form with proper data structure
  async submitForm() {
    const errors = this.validateForm();
    if (errors.length > 0) {
      alert('Please fix the following errors: ' + errors.join(', '));
      return;
    }

    const formData = new FormData();
    
    // Add all form fields
    Object.keys(this.state.formData).forEach(key => {
      if (this.state.formData[key] !== null && this.state.formData[key] !== undefined) {
        formData.append(key, this.state.formData[key]);
      }
    });

    // Add files if present
    const governmentIdFile = document.querySelector('#governmentId').files[0];
    const surveyDocsFile = document.querySelector('#surveyDocuments').files[0];
    
    if (governmentIdFile) formData.append('governmentId', governmentIdFile);
    if (surveyDocsFile) formData.append('surveyDocuments', surveyDocsFile);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.status_code === 201) {
        alert('Property created successfully!');
        this.resetForm();
      } else {
        alert('Error creating property: ' + result.data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create property');
    }
  }
};

// Usage example:
// PropertyForm.onPropertyTypeChange('land'); // Hides bedrooms/bathrooms
// PropertyForm.onPropertyTypeChange('house'); // Shows bedrooms/bathrooms
