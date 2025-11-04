const { supabaseAdmin } = require('../config/supabase');

class Business {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.user_id = data.user_id;
        this.mongodb_link = data.mongodb_link;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
    }

    // Create a new business
    static async create(businessData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('businesses')
                .insert([{
                    name: businessData.name,
                    description: businessData.description,
                    mongodb_link: businessData.mongodb_link,
                    user_id: businessData.user_id
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return new Business(data);
        } catch (error) {
            console.error('Error creating business:', error);
            throw error;
        }
    }

    // Get all businesses for a user
    static async findByUserId(userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('businesses')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data.map(business => new Business(business));
        } catch (error) {
            console.error('Error finding businesses by user ID:', error);
            throw error;
        }
    }

    // Get business by ID
    static async findById(id) {
        try {
            const { data, error } = await supabaseAdmin
                .from('businesses')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                throw error;
            }

            return new Business(data);
        } catch (error) {
            console.error('Error finding business by ID:', error);
            throw error;
        }
    }

    // Update business
    static async update(id, updateData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('businesses')
                .update({
                    name: updateData.name,
                    description: updateData.description,
                    mongodb_link: updateData.mongodb_link,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return new Business(data);
        } catch (error) {
            console.error('Error updating business:', error);
            throw error;
        }
    }

    // Delete business
    static async delete(id) {
        try {
            const { error } = await supabaseAdmin
                .from('businesses')
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            console.error('Error deleting business:', error);
            throw error;
        }
    }

    // Verify business belongs to user
    static async verifyOwnership(businessId, userId) {
        try {
            const { data, error } = await supabaseAdmin
                .from('businesses')
                .select('id')
                .eq('id', businessId)
                .eq('user_id', userId)
                .single();

            if (error) {
                return false;
            }

            return !!data;
        } catch (error) {
            console.error('Error verifying business ownership:', error);
            return false;
        }
    }
}

module.exports = Business;