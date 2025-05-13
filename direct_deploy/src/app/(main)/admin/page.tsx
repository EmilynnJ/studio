'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { collection, getDocs, doc, setDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { AppUser } from '@/types/user';

export default function AdminDashboard() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [readers, setReaders] = useState<AppUser[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('readers');
  
  // New reader form state
  const [newReader, setNewReader] = useState({
    name: '',
    email: '',
    password: '',
    bio: '',
    specialties: '',
    ratePerMinute: 5,
    photoURL: '',
  });
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form errors
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!loading) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/login');
      } else {
        fetchReaders();
        fetchProducts();
      }
    }
  }, [currentUser, loading, router]);

  const fetchReaders = async () => {
    try {
      const readersQuery = query(collection(db, 'users'), where('role', '==', 'reader'));
      const readersSnapshot = await getDocs(readersQuery);
      const readersList = readersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as AppUser[];
      setReaders(readersList);
    } catch (error) {
      console.error('Error fetching readers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsQuery = query(collection(db, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewReader(prev => ({
      ...prev,
      [name]: name === 'ratePerMinute' ? parseFloat(value) : value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const uploadProfileImage = async (): Promise<string> => {
    if (!selectedFile) return '';
    
    const storage = getStorage();
    const fileExtension = selectedFile.name.split('.').pop();
    const fileName = `profile_images/${uuidv4()}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    try {
      const uploadTask = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(uploadTask.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newReader.name.trim()) errors.name = 'Name is required';
    if (!newReader.email.trim()) errors.email = 'Email is required';
    if (!newReader.password.trim()) errors.password = 'Password is required';
    if (newReader.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!newReader.bio.trim()) errors.bio = 'Bio is required';
    if (!newReader.specialties.trim()) errors.specialties = 'Specialties are required';
    if (newReader.ratePerMinute <= 0) errors.ratePerMinute = 'Rate must be greater than 0';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createReaderAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Upload profile image if selected
      let photoURL = '';
      if (selectedFile) {
        photoURL = await uploadProfileImage();
      }
      
      // Create user in Firebase Authentication (via API route)
      const response = await fetch('/api/admin/create-reader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newReader.email,
          password: newReader.password,
          displayName: newReader.name,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create reader account');
      }
      
      const { uid } = await response.json();
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        uid,
        email: newReader.email,
        name: newReader.name,
        role: 'reader',
        bio: newReader.bio,
        specialties: newReader.specialties,
        ratePerMinute: newReader.ratePerMinute,
        photoURL,
        status: 'offline',
        createdAt: new Date(),
      });
      
      // Reset form
      setNewReader({
        name: '',
        email: '',
        password: '',
        bio: '',
        specialties: '',
        ratePerMinute: 5,
        photoURL: '',
      });
      setSelectedFile(null);
      
      // Refresh readers list
      fetchReaders();
      
      alert('Reader account created successfully!');
    } catch (error: any) {
      console.error('Error creating reader account:', error);
      alert(`Error creating reader account: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const syncProductsWithStripe = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/sync-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync products');
      }
      
      const { products } = await response.json();
      
      // Update products in Firestore
      for (const product of products) {
        const productDocRef = doc(db, 'products', product.id);
        const productDoc = await getDoc(productDocRef);
        
        if (productDoc.exists()) {
          await updateDoc(productDocRef, {
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image,
            active: product.active,
            updatedAt: new Date(),
          });
        } else {
          await setDoc(productDocRef, {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image,
            active: product.active,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      
      // Refresh products list
      fetchProducts();
      
      alert('Products synced successfully!');
    } catch (error: any) {
      console.error('Error syncing products:', error);
      alert(`Error syncing products: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="readers">Manage Readers</TabsTrigger>
          <TabsTrigger value="products">Manage Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="readers">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Add New Reader</CardTitle>
                  <CardDescription>Create a new reader account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={createReaderAccount}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={newReader.name} 
                          onChange={handleInputChange} 
                          className={formErrors.name ? 'border-red-500' : ''}
                        />
                        {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input 
                          id="email" 
                          name="email" 
                          type="email" 
                          value={newReader.email} 
                          onChange={handleInputChange}
                          className={formErrors.email ? 'border-red-500' : ''}
                        />
                        {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                      </div>
                      
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input 
                          id="password" 
                          name="password" 
                          type="password" 
                          value={newReader.password} 
                          onChange={handleInputChange}
                          className={formErrors.password ? 'border-red-500' : ''}
                        />
                        {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
                      </div>
                      
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea 
                          id="bio" 
                          name="bio" 
                          value={newReader.bio} 
                          onChange={handleInputChange}
                          className={formErrors.bio ? 'border-red-500' : ''}
                        />
                        {formErrors.bio && <p className="text-red-500 text-sm mt-1">{formErrors.bio}</p>}
                      </div>
                      
                      <div>
                        <Label htmlFor="specialties">Specialties</Label>
                        <Textarea 
                          id="specialties" 
                          name="specialties" 
                          value={newReader.specialties} 
                          onChange={handleInputChange}
                          className={formErrors.specialties ? 'border-red-500' : ''}
                        />
                        {formErrors.specialties && <p className="text-red-500 text-sm mt-1">{formErrors.specialties}</p>}
                      </div>
                      
                      <div>
                        <Label htmlFor="ratePerMinute">Rate Per Minute ($)</Label>
                        <Input 
                          id="ratePerMinute" 
                          name="ratePerMinute" 
                          type="number" 
                          min="1" 
                          step="0.01" 
                          value={newReader.ratePerMinute} 
                          onChange={handleInputChange}
                          className={formErrors.ratePerMinute ? 'border-red-500' : ''}
                        />
                        {formErrors.ratePerMinute && <p className="text-red-500 text-sm mt-1">{formErrors.ratePerMinute}</p>}
                      </div>
                      
                      <div>
                        <Label htmlFor="photo">Profile Photo</Label>
                        <Input 
                          id="photo" 
                          name="photo" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange} 
                        />
                        {selectedFile && (
                          <p className="text-sm mt-1">Selected: {selectedFile.name}</p>
                        )}
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Reader Account'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Reader Accounts</CardTitle>
                  <CardDescription>Manage existing reader accounts</CardDescription>
                </CardHeader>
                <CardContent>
                  {readers.length === 0 ? (
                    <p>No readers found.</p>
                  ) : (
                    <div className="space-y-4">
                      {readers.map((reader) => (
                        <div key={reader.uid} className="flex items-start space-x-4 p-4 border rounded-lg">
                          <Avatar className="h-12 w-12">
                            {reader.photoURL ? (
                              <img src={reader.photoURL} alt={reader.name || ''} />
                            ) : (
                              <div className="bg-primary text-white flex items-center justify-center h-full w-full">
                                {reader.name?.charAt(0) || 'R'}
                              </div>
                            )}
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium">{reader.name}</h3>
                              <Badge variant={reader.status === 'online' ? 'success' : 'secondary'}>
                                {reader.status || 'offline'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{reader.email}</p>
                            <p className="text-sm mt-1">Rate: ${reader.ratePerMinute}/min</p>
                            <p className="text-sm mt-1 line-clamp-2">{reader.bio}</p>
                          </div>
                          
                          <Button variant="outline" size="sm" onClick={() => router.push(`/admin/readers/${reader.uid}`)}>
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shop Products</CardTitle>
                  <CardDescription>Manage products synced from Stripe</CardDescription>
                </div>
                <Button onClick={syncProductsWithStripe} disabled={isLoading}>
                  {isLoading ? 'Syncing...' : 'Sync with Stripe'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p>No products found. Click "Sync with Stripe" to import products.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <Badge variant={product.active ? 'default' : 'secondary'}>
                            {product.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {product.image && (
                          <div className="aspect-square w-full mb-4 bg-gray-100 rounded-md overflow-hidden">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <p className="text-sm line-clamp-3 mb-2">{product.description}</p>
                        <p className="font-medium">${(product.price / 100).toFixed(2)}</p>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/admin/products/${product.id}`)}>
                          Edit Product
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Platform Analytics</CardTitle>
              <CardDescription>View performance metrics and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}