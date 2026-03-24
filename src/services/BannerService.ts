import { db, collection, getDocs, addDoc, updateDoc, doc, query, orderBy, where, deleteDoc, serverTimestamp, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { Banner } from '../types';

const COLLECTION_NAME = 'banners';

export const getBanners = async (): Promise<Banner[]> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
    } as Banner));
  } catch (error) {
    console.error('Error fetching banners:', error);
    throw error;
  }
};

export const getActiveBanners = async (): Promise<Banner[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('active', '==', true),
      orderBy('order', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
    } as Banner));
  } catch (error) {
    console.error('Error fetching active banners:', error);
    throw error;
  }
};

export const addBanner = async (banner: Omit<Banner, 'id' | 'createdAt'>, file?: File): Promise<string> => {
  try {
    let imageUrl = banner.image;

    if (file) {
      const fileRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(fileRef);
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...banner,
      image: imageUrl,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding banner:', error);
    throw error;
  }
};

export const updateBanner = async (id: string, updates: Partial<Banner>, file?: File): Promise<void> => {
  try {
    let imageUrl = updates.image;

    if (file) {
      const fileRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(fileRef);
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    // Remove properties that shouldn't be updated directly via Firestore doc update
    const { id: _, createdAt: __, ...validUpdates } = updates as any;

    const dataToUpdate: any = {
      ...validUpdates,
      updatedAt: serverTimestamp()
    };

    if (imageUrl) {
      dataToUpdate.image = imageUrl;
    }

    await updateDoc(docRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating banner:', error);
    throw error;
  }
};

export const deleteBanner = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error('Error deleting banner:', error);
    throw error;
  }
};

export const toggleBannerStatus = async (id: string, active: boolean): Promise<void> => {
  await updateBanner(id, { active });
};
