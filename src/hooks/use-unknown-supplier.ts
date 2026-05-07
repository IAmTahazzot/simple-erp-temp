import { useEffect, useState } from 'react';
import { database } from '@/database';
import { Q } from '@nozbe/watermelondb';
import { useOnline } from '@/hooks/use-online'
import { supabase } from '@/services/supabase'

export const UNKNOWN_SUPPLIER_NAME = 'Unknown Supplier';

const createUnknownSupplier = async (isOnline: boolean) => {
  try {

    const newSupplier =  await database.write(async () => {
      return await database.collections.get('suppliers').create(supplier => {
        supplier.name = UNKNOWN_SUPPLIER_NAME;
      });
    })
    
    const supabaseCreatedAt = new Date(newSupplier.createdAt).getTime() 
    const supabaseUpdatedAt = new Date(newSupplier.updatedAt).getTime()
    
    if (isOnline) {
      try {
        await supabase.from('suppliers').insert({
          id: newSupplier.id,
          name: newSupplier.name,
          created_at: supabaseCreatedAt,
          updated_at: supabaseUpdatedAt,
        })
      } catch(err) {
        console.error('Error syncing unknown supplier to Supabase:', err);
      }
    }
    
    return newSupplier;
  } catch (e) {
    console.error('Error creating unknown supplier:', e);
    return null;
  }
}

export const useUnknownSupplier = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [unknownSupplier, setUnknownSupplier] = useState(null);
  const { isOnline } = useOnline();
  
  useEffect(() => {
    const fetchUnknownSupplier = async () => {
      setIsLoading(true);
      try {
        const res = await database
          .collections
          .get('suppliers')
          .query(
            Q.where('name', UNKNOWN_SUPPLIER_NAME)
          )
          .fetch();
        if (res.length > 0) {
          setUnknownSupplier(res[0]);
        } else {
          const newSupplier = await createUnknownSupplier(isOnline);
          setUnknownSupplier(newSupplier);
        }
      } catch (e) {
        console.error('Error fetching unknown supplier:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnknownSupplier();
  }, []);

  return { unknownSupplier, isLoading };
};
